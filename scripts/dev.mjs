import {spawn, spawnSync} from 'node:child_process'

const env = {...process.env}
if (process.platform === 'darwin' && !env.DATABASE_URL) {
  const result = spawnSync('security', ['find-generic-password', '-s', 'studies-supabase-database-url', '-a', 'studies', '-w'], {encoding: 'utf8'})
  if (result.status === 0 && result.stdout.trim()) env.DATABASE_URL = result.stdout.trim()
}

const child = spawn('next', ['dev', ...process.argv.slice(2)], {env, stdio: 'inherit', shell: process.platform === 'win32'})
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal)
  else process.exit(code ?? 1)
})
