import {and, eq} from 'drizzle-orm'
import {NextResponse} from 'next/server'
import {z} from 'zod'

import {auth} from '@/auth'
import {readJson} from '@/lib/api'
import {db} from '@/lib/db'
import {knowledgeItems} from '@/lib/schema'

const updateSchema = z.object({
  body: z.string().trim().min(1).max(20000),
  document: z.array(z.record(z.string(), z.unknown())).max(1000),
  status: z.enum(['draft', 'verified']).optional(),
})

export async function PATCH(request: Request, {params}: {params: Promise<{id: string}>}) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({error: 'Não autorizado.'}, {status: 401})
  const parsed = updateSchema.safeParse(await readJson(request))
  if (!parsed.success) return NextResponse.json({error: 'Conteúdo inválido.'}, {status: 400})
  const {id} = await params
  const result = await db.update(knowledgeItems).set({body: parsed.data.body, document: parsed.data.document, status: parsed.data.status, updatedAt: new Date()}).where(and(eq(knowledgeItems.id, id), eq(knowledgeItems.userId, session.user.id))).returning({id: knowledgeItems.id})
  if (!result[0]) return NextResponse.json({error: 'Não encontrado.'}, {status: 404})
  return NextResponse.json({ok: true})
}
