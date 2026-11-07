import {createHash} from 'node:crypto'
import {mkdir, readFile, writeFile} from 'node:fs/promises'
import {dirname, join} from 'node:path'

const commit = '9d66c91b7c5c6b47ae07d39266d3948aead01f86'
const files = [
  {
    "path": "app/favicon.ico",
    "size": 25931,
    "sha": "718d6fea4835ec2d246af9800eddb7ffb276240c"
  },
  {
    "path": "assets/fonts/Archivo-ExtraBold-latin.ttf",
    "size": 41176,
    "sha": "3b048c7fdd86a5181319d7c9b22db280fe300417"
  },
  {
    "path": "assets/fonts/Geist-Medium-latin.ttf",
    "size": 32424,
    "sha": "8f5e69eabf84694778e79d585a404b052c9e7e95"
  },
  {
    "path": "public/samples/algebra-10.pdf",
    "size": 2607,
    "sha": "1698a9b92c7881910be501ace4d9e05762430547"
  },
  {
    "path": "public/samples/algebra-25.pdf",
    "size": 5759,
    "sha": "c79753c0837e12f63aad2c97a692b050e62211fe"
  },
  {
    "path": "public/samples/algebra-5.pdf",
    "size": 1589,
    "sha": "4b33741cd1364e94d0493281ba3edc71984a6991"
  }
]

function gitSha(buffer) {
  return createHash('sha1').update(Buffer.from('blob ' + buffer.length + '\0')).update(buffer).digest('hex')
}

async function ensure(file) {
  const local = join(process.cwd(), file.path)
  try {
    const contents = await readFile(local)
    if (contents.length === file.size && gitSha(contents) === file.sha) return
  } catch {}
  const url = 'https://raw.githubusercontent.com/DagaVedant/StudyBuddy/' + commit + '/' + file.path
  const response = await fetch(url)
  if (!response.ok) throw new Error('Falha no download ' + file.path + ': HTTP ' + response.status)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length !== file.size || gitSha(bytes) !== file.sha) {
    throw new Error('Arquivo inválido (tamanho ou checksum): ' + file.path)
  }
  await mkdir(dirname(local), {recursive:true})
  await writeFile(local,bytes)
  console.log('Asset restaurado: ' + file.path)
}

for (const file of files) await ensure(file)
console.log('Assets binários conferidos: ' + files.length)
