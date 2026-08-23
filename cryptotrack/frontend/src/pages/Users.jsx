import React, { useEffect, useState } from 'react'
import { useAuthStore, useUsersStore } from '../store'
import { Modal, ConfirmDialog, Spinner, Empty } from '../components/ui'

function RoleBadge({ role }) {
  const isAdmin = role === 'ADMIN'
  return (
    <span
      className="badge border"
      style={{
        background: isAdmin ? '#8247E522' : '#3f3f4622',
        borderColor: isAdmin ? '#8247E544' : '#52525b44',
        color: isAdmin ? '#c4b5fd' : '#a1a1aa',
      }}
    >
      <i className={`ti ${isAdmin ? 'ti-shield-star' : 'ti-user'} text-xs mr-1`} />
      {isAdmin ? 'Admin' : 'Usuário'}
    </span>
  )
}

function StatusBadge({ active }) {
  return (
    <span
      className="badge border"
      style={{
        background: active ? '#1D9E7522' : '#E8414222',
        borderColor: active ? '#1D9E7544' : '#E8414244',
        color: active ? '#34d399' : '#f87171',
      }}
    >
      {active ? 'Ativo' : 'Desativado'}
    </span>
  )
}

// Modal de criação — usada só para convidar novos usuários.
function CreateUserModal({ onClose, onCreated }) {
  const { createUser } = useUsersStore()
  const [form, setForm] = useState({ name: '', email: '', role: 'USER' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit() {
    setError('')
    if (form.name.trim().length < 2) return setError('Nome muito curto')
    if (!/^\S+@\S+\.\S+$/.test(form.email)) return setError('E-mail inválido')

    setSaving(true)
    try {
      const result = await createUser(form)
      onCreated(result)
      onClose()
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao criar usuário')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Convidar usuário" onClose={onClose} width="440px">
      <div className="space-y-4">
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Nome</label>
          <input className="input" placeholder="Nome completo" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-zinc-500 block mb-1">E-mail</label>
          <input className="input" type="email" placeholder="email@exemplo.com" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div>
          <label className="text-xs text-zinc-500 block mb-1">Acesso</label>
          <select className="input" value={form.role} onChange={e => set('role', e.target.value)}>
            <option value="USER">Usuário — acesso normal ao app</option>
            <option value="ADMIN">Administrador — gerencia usuários</option>
          </select>
        </div>

        {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={saving}>
            {saving ? <><i className="ti ti-loader-2 animate-spin" /> Criando...</> : 'Criar usuário'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// Modal simples exibida uma única vez com a senha temporária gerada
// (criação ou reset). Precisa ser copiada agora — não é salva em lugar nenhum.
function TempPasswordModal({ email, tempPassword, onClose }) {
  const [copied, setCopied] = useState(false)
  function copy() {
    navigator.clipboard?.writeText(tempPassword)
    setCopied(true)
  }
  return (
    <Modal title="Senha temporária gerada" onClose={onClose} width="440px">
      <div className="space-y-4">
        <p className="text-sm text-zinc-400">
          Repasse esta senha para <span className="font-medium text-zinc-200">{email}</span> por um canal seguro.
          Ela não será exibida novamente.
        </p>
        <div className="flex items-center gap-2 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5">
          <code className="flex-1 font-mono text-sm text-amber-400">{tempPassword}</code>
          <button className="btn p-1.5" onClick={copy} title="Copiar">
            <i className={`ti ${copied ? 'ti-check' : 'ti-copy'} text-base`} />
          </button>
        </div>
        <div className="flex justify-end pt-1">
          <button className="btn btn-primary" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </Modal>
  )
}

export default function Users() {
  const { user: me } = useAuthStore()
  const { users, loading, fetchUsers, updateUser, resetPassword, deleteUser } = useUsersStore()

  const [createModal, setCreateModal] = useState(false)
  const [tempPwModal, setTempPwModal] = useState(null) // { email, tempPassword }
  const [confirmDelete, setConfirmDelete] = useState(null) // user
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => { fetchUsers() }, [])

  async function handleToggleRole(u) {
    setError(''); setBusyId(u.id)
    try {
      await updateUser(u.id, { role: u.role === 'ADMIN' ? 'USER' : 'ADMIN' })
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao atualizar usuário')
    } finally { setBusyId(null) }
  }

  async function handleToggleActive(u) {
    setError(''); setBusyId(u.id)
    try {
      await updateUser(u.id, { active: !u.active })
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao atualizar usuário')
    } finally { setBusyId(null) }
  }

  async function handleResetPassword(u) {
    setError(''); setBusyId(u.id)
    try {
      const { tempPassword } = await resetPassword(u.id)
      setTempPwModal({ email: u.email, tempPassword })
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao resetar senha')
    } finally { setBusyId(null) }
  }

  async function handleDelete() {
    if (!confirmDelete) return
    setBusyId(confirmDelete.id)
    try {
      await deleteUser(confirmDelete.id)
      setConfirmDelete(null)
    } catch (e) {
      setError(e.response?.data?.error || 'Erro ao excluir usuário')
      setConfirmDelete(null)
    } finally { setBusyId(null) }
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Usuários</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Gerencie quem tem acesso ao CryptoTrack</p>
        </div>
        <button className="btn btn-primary" onClick={() => setCreateModal(true)}>
          <i className="ti ti-user-plus" /> Convidar usuário
        </button>
      </div>

      {error && <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Acesso</th>
              <th>Status</th>
              <th>Criado em</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && !users.length ? (
              <tr><td colSpan={6}><Spinner /></td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6}><Empty text="Nenhum usuário encontrado." /></td></tr>
            ) : users.map(u => {
              const isSelf = u.id === me?.id
              const rowBusy = busyId === u.id
              return (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                        {u.name?.slice(0,1).toUpperCase()}
                      </div>
                      <span className="font-medium">{u.name}</span>
                      {isSelf && <span className="text-xs muted">(você)</span>}
                    </div>
                  </td>
                  <td className="text-sm muted">{u.email}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td><StatusBadge active={!!u.active} /></td>
                  <td className="text-xs muted">{(u.created_at || '').slice(0,10)}</td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        className="btn p-1.5" title={u.role === 'ADMIN' ? 'Remover acesso de admin' : 'Tornar admin'}
                        onClick={() => handleToggleRole(u)} disabled={rowBusy || isSelf}
                      >
                        <i className="ti ti-shield-star text-base" />
                      </button>
                      <button
                        className="btn p-1.5" title={u.active ? 'Desativar' : 'Ativar'}
                        onClick={() => handleToggleActive(u)} disabled={rowBusy || isSelf}
                      >
                        <i className={`ti ${u.active ? 'ti-player-pause' : 'ti-player-play'} text-base`} />
                      </button>
                      <button
                        className="btn p-1.5" title="Resetar senha"
                        onClick={() => handleResetPassword(u)} disabled={rowBusy}
                      >
                        <i className="ti ti-key text-base" />
                      </button>
                      <button
                        className="btn btn-danger p-1.5" title="Excluir"
                        onClick={() => setConfirmDelete(u)} disabled={rowBusy || isSelf}
                      >
                        <i className="ti ti-trash text-base" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {createModal && (
        <CreateUserModal
          onClose={() => setCreateModal(false)}
          onCreated={({ user, tempPassword }) => setTempPwModal({ email: user.email, tempPassword })}
        />
      )}

      {tempPwModal && (
        <TempPasswordModal
          email={tempPwModal.email}
          tempPassword={tempPwModal.tempPassword}
          onClose={() => setTempPwModal(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Excluir usuário"
          message={`Tem certeza que deseja excluir "${confirmDelete.name}"? Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
          loading={busyId === confirmDelete.id}
        />
      )}
    </div>
  )
}
