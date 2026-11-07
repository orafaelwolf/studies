import {and, eq} from 'drizzle-orm'
import {NextResponse} from 'next/server'
import {z} from 'zod'

import {auth} from '@/auth'
import {readJson} from '@/lib/api'
import {db, isUniqueViolation} from '@/lib/db'
import {flashcards} from '@/lib/schema'
import {stableHash} from '@/lib/studies'

const schema = z.object({front: z.string().trim().min(1).max(4000), back: z.string().trim().min(1).max(8000), status: z.enum(['draft', 'approved', 'archived'])})

export async function PATCH(request: Request, {params}: {params: Promise<{id: string}>}) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({error: 'Não autorizado.'}, {status: 401})
  const parsed = schema.safeParse(await readJson(request))
  if (!parsed.success) return NextResponse.json({error: 'Cartão inválido.'}, {status: 400})
  const {id} = await params
  let result
  try {
    result = await db.update(flashcards).set({...parsed.data, contentHash: stableHash('flashcard', parsed.data.front, parsed.data.back), updatedAt: new Date()}).where(and(eq(flashcards.id, id), eq(flashcards.userId, session.user.id))).returning({id: flashcards.id})
  } catch (error) {
    if (isUniqueViolation(error)) return NextResponse.json({error: 'Já existe um cartão com este conteúdo.'}, {status: 409})
    throw error
  }
  if (!result[0]) return NextResponse.json({error: 'Não encontrado.'}, {status: 404})
  return NextResponse.json({ok: true})
}
