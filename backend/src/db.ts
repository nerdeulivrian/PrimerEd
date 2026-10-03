import pg from 'pg'
import { config } from './config.ts'
import type { Lesson } from './lesson/types.ts'

const ssl = /sslmode=(require|verify)/.test(config.databaseUrl) ? { rejectUnauthorized: false } : undefined
export const pool = new pg.Pool({ connectionString: config.databaseUrl.replace(/[?&]sslmode=[^&]*/, ''), ssl, max: 10 })

/** Creates the tables if they aren't there yet. Safe to run on every start. */
export async function migrate() {
  await pool.query(`
    create table if not exists learners (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now()
    );
    create table if not exists experiences (
      id uuid primary key default gen_random_uuid(),
      learner_id uuid not null references learners on delete cascade,
      title text not null,
      subject text not null,
      headline text not null,
      thumbnail text not null,
      created_at timestamptz not null default now(),
      -- null until the learner first opens its level path: shows the NEW tag
      opened_at timestamptz
    );
    create index if not exists experiences_learner on experiences (learner_id, created_at);
    create table if not exists levels (
      id uuid primary key default gen_random_uuid(),
      experience_id uuid not null references experiences on delete cascade,
      position int not null,
      title text not null,
      rank text not null,
      lesson jsonb not null,
      completed_at timestamptz,
      score int,
      total int,
      unique (experience_id, position)
    );
    -- One-time codes that hand a level over from landing to the lesson app.
    create table if not exists launches (
      code text primary key,
      learner_id uuid not null references learners on delete cascade,
      level_id uuid not null references levels on delete cascade,
      expires_at timestamptz not null,
      used_at timestamptz
    );
  `)
}

export async function createLearner(): Promise<string> {
  const { rows } = await pool.query<{ id: string }>('insert into learners default values returning id')
  return rows[0].id
}

export async function learnerExists(id: string) {
  const { rowCount } = await pool.query('select 1 from learners where id = $1', [id])
  return rowCount === 1
}

/** An experience as the landing screens show it (matches landing's `Experience`). */
export interface ExperienceView {
  id: string
  title: string
  subject: string
  headline: string
  thumbnail: string
  levels: { title: string; rank: string }[]
  done: number
  isNew: boolean
}

export async function listExperiences(learnerId: string): Promise<ExperienceView[]> {
  const { rows } = await pool.query(
    `select e.id, e.title, e.subject, e.headline, e.thumbnail, e.opened_at is null as "isNew",
            json_agg(json_build_object('title', l.title, 'rank', l.rank, 'done', l.completed_at is not null)
                     order by l.position) as levels
       from experiences e join levels l on l.experience_id = e.id
      where e.learner_id = $1
      group by e.id
      order by e.created_at`,
    [learnerId],
  )
  return rows.map((r) => {
    const levels = r.levels as { title: string; rank: string; done: boolean }[]
    // Levels unlock in order, so "done" is how many in a row are finished.
    const firstOpen = levels.findIndex((l) => !l.done)
    return {
      id: r.id,
      title: r.title,
      subject: r.subject,
      headline: r.headline,
      thumbnail: r.thumbnail,
      levels: levels.map(({ title, rank }) => ({ title, rank })),
      done: firstOpen === -1 ? levels.length : firstOpen,
      isNew: r.isNew,
    }
  })
}

export interface NewExperience {
  title: string
  subject: string
  headline: string
  thumbnail: string
  levels: { title: string; rank: string; lesson: Lesson }[]
}

/** Saves an experience and all its levels at once, or nothing. */
export async function saveExperience(learnerId: string, e: NewExperience): Promise<string> {
  const client = await pool.connect()
  try {
    await client.query('begin')
    const { rows } = await client.query<{ id: string }>(
      'insert into experiences (learner_id, title, subject, headline, thumbnail) values ($1, $2, $3, $4, $5) returning id',
      [learnerId, e.title, e.subject, e.headline, e.thumbnail],
    )
    const id = rows[0].id
    for (const [i, level] of e.levels.entries()) {
      await client.query(
        'insert into levels (experience_id, position, title, rank, lesson) values ($1, $2, $3, $4, $5)',
        [id, i, level.title, level.rank, JSON.stringify(level.lesson)],
      )
    }
    await client.query('commit')
    return id
  } catch (err) {
    await client.query('rollback')
    throw err
  } finally {
    client.release()
  }
}

export async function markOpened(learnerId: string, experienceId: string) {
  await pool.query('update experiences set opened_at = coalesce(opened_at, now()) where id = $1 and learner_id = $2', [
    experienceId,
    learnerId,
  ])
}

export interface LevelRow {
  id: string
  experienceId: string
  position: number
  title: string
  lesson: Lesson
}

export async function getLevel(learnerId: string, experienceId: string, position: number): Promise<LevelRow | null> {
  const { rows } = await pool.query(
    `select l.id, l.experience_id as "experienceId", l.position, l.title, l.lesson
       from levels l join experiences e on e.id = l.experience_id
      where e.learner_id = $1 and e.id = $2 and l.position = $3`,
    [learnerId, experienceId, position],
  )
  return rows[0] ?? null
}

export async function createLaunch(learnerId: string, levelId: string, code: string) {
  await pool.query(
    `insert into launches (code, learner_id, level_id, expires_at) values ($1, $2, $3, now() + interval '10 minutes')`,
    [code, learnerId, levelId],
  )
}

/** Uses up a launch code: the learner and level it was made for, or null if it's unknown, used or expired. */
export async function useLaunch(code: string): Promise<{ learnerId: string; level: LevelRow } | null> {
  const { rows } = await pool.query(
    `update launches set used_at = now()
      where code = $1 and used_at is null and expires_at > now()
      returning learner_id as "learnerId", level_id as "levelId"`,
    [code],
  )
  if (!rows[0]) return null
  return { learnerId: rows[0].learnerId, level: await levelById(rows[0].levelId) }
}

/** The level a launch code opens, without using the code up; null if it's unknown, used or expired. */
export async function peekLaunch(code: string): Promise<LevelRow | null> {
  const { rows } = await pool.query(
    `select level_id as "levelId" from launches where code = $1 and used_at is null and expires_at > now()`,
    [code],
  )
  return rows[0] ? levelById(rows[0].levelId) : null
}

async function levelById(id: string): Promise<LevelRow> {
  const { rows } = await pool.query(
    `select id, experience_id as "experienceId", position, title, lesson from levels where id = $1`,
    [id],
  )
  return rows[0]
}

export async function completeLevel(levelId: string, score: number, total: number) {
  await pool.query(
    `update levels set completed_at = coalesce(completed_at, now()), score = greatest(coalesce(score, 0), $2), total = $3
      where id = $1`,
    [levelId, score, total],
  )
}
