import React, { useEffect, useState } from "react";
import { usePortfolioStore } from "../store";
import {
  KpiCard,
  Modal,
  COINS,
  useFmt,
  fmt,
  Spinner,
  Empty,
  ConfirmDialog,
} from "../components/ui";

const today = () => new Date().toISOString().split("T")[0];

function DefiModal({ onClose }) {
  const { addDefi } = usePortfolioStore();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    start_date: today(),
    protocol: "",
    type: "Staking",
    asset: "ETH",
    deposited: "",
    apy: "",
    obs: "",
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  async function handleSubmit() {
    if (!form.protocol || !form.deposited) return;
    setSaving(true);
    try {
      await addDefi({
        ...form,
        deposited: parseFloat(form.deposited),
        apy: parseFloat(form.apy) || 0,
      });
      onClose();
    } catch {
      alert("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title="Nova posição DeFi" onClose={onClose}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">
              Data entrada
            </label>
            <input
              className="input"
              type="date"
              value={form.start_date}
              onChange={(e) => set("start_date", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">
              Protocolo
            </label>
            <input
              className="input"
              placeholder="Aave, Uniswap..."
              value={form.protocol}
              onChange={(e) => set("protocol", e.target.value)}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Tipo</label>
            <select
              className="input"
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
            >
              {["Staking", "Yield Farming", "Liquidity Pool"].map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">Ativo</label>
            <select
              className="input"
              value={form.asset}
              onChange={(e) => set("asset", e.target.value)}
            >
              {COINS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-zinc-500 block mb-1">
              Valor depositado (R$)
            </label>
            <input
              className="input font-mono"
              type="number"
              step="any"
              placeholder="0,00"
              value={form.deposited}
              onChange={(e) => set("deposited", e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 block mb-1">APY (%)</label>
            <input
              className="input font-mono"
              type="number"
              step="any"
              placeholder="12.5"
              value={form.apy}
              onChange={(e) => set("apy", e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-zinc-500 block mb-1">
            Observações
          </label>
          <input
            className="input"
            value={form.obs}
            onChange={(e) => set("obs", e.target.value)}
          />
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={saving}
          >
            <i className="ti ti-check" /> Salvar
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function DeFi() {
  const { defi, fetchDefi, deleteDefi, deleteDefiBulk, closeDefi, loading } =
    usePortfolioStore();
  const { fmtMoney, fmt: _fmt } = useFmt();
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    fetchDefi();
  }, []);

  const data = defi.data || [];
  const totalDeposited = defi.totalDeposited || 0;
  const totalRewards = defi.totalRewards || 0;
  const active = data.filter((d) => !d.exit_date);

  async function handleClose(pos) {
    const withdrawn = prompt("Valor retirado (R$):");
    if (!withdrawn) return;
    await closeDefi(pos.id, today(), parseFloat(withdrawn));
  }

  const typeBadge = {
    Staking: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    "Yield Farming": "bg-amber-500/10 text-amber-400 border-amber-500/20",
    "Liquidity Pool": "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };

  function toggle(id) {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }

      return [...prev, id];
    });
  }

  function toggleAll() {
    if (selected.length === data.length) {
      setSelected([]);
      return;
    }

    setSelected(data.map((d) => d.id));
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      await deleteDefiBulk(selected);
      setSelected([]);
    } finally {
      setBulkDeleting(false);
      setConfirmBulkDelete(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">DeFi</h1>
        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <i className="ti ti-plus" /> Nova posição
        </button>
      </div>

      {selected.length > 0 && (
        <div>
          <button className="btn btn-danger" onClick={() => setConfirmBulkDelete(true)}>
            <i className="ti ti-trash" />
            Excluir Selecionados ({selected.length})
          </button>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Total depositado" value={fmtMoney(totalDeposited)} />
        <KpiCard
          label="Recompensas acumuladas"
          value={fmtMoney(totalRewards)}
          color="up"
        />
        <KpiCard label="Posições ativas" value={active.length} />
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={data.length > 0 && selected.length === data.length}
                  onChange={toggleAll}
                />
              </th>
              <th>Entrada</th>
              <th>Protocolo</th>
              <th>Tipo</th>
              <th>Ativo</th>
              <th>Depositado</th>
              <th>APY</th>
              <th>Recompensas</th>
              <th>Saída</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10}>
                  <Spinner />
                </td>
              </tr>
            ) : data.length ? (
              data.map((d) => (
                <tr key={d.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(d.id)}
                      onChange={() => toggle(d.id)}
                    />
                  </td>
                  <td className="muted text-xs">{d.start_date}</td>
                  <td className="font-medium">{d.protocol}</td>
                  <td>
                    <span className={`badge border ${typeBadge[d.type] || ""}`}>
                      {d.type}
                    </span>
                  </td>
                  <td>{d.asset}</td>
                  <td className="font-mono text-xs">{fmtMoney(d.deposited)}</td>
                  <td className="up">{fmt(d.apy, 1)}%</td>
                  <td className="up font-mono text-xs">
                    {fmtMoney(d.rewards)}
                  </td>
                  <td className={d.exit_date ? "muted text-xs" : "up text-xs"}>
                    {d.exit_date || "Em aberto"}
                  </td>
                  <td>
                    <div className="flex gap-1">
                      {!d.exit_date && (
                        <button
                          className="btn text-xs py-1 px-2"
                          onClick={() => handleClose(d)}
                        >
                          <i className="ti ti-door-exit text-sm" />
                        </button>
                      )}
                      <button
                        className="btn btn-danger p-1.5"
                        onClick={() => deleteDefi(d.id)}
                      >
                        <i className="ti ti-trash text-sm" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={10}>
                  <Empty text="Nenhuma posição DeFi." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && <DefiModal onClose={() => setModal(false)} />}

      {confirmBulkDelete && (
        <ConfirmDialog
          title="Excluir posições DeFi"
          message={`Tem certeza que deseja excluir ${selected.length} posição(ões) DeFi selecionada(s)? Essa ação não pode ser desfeita.`}
          confirmLabel={`Excluir ${selected.length}`}
          onConfirm={handleBulkDelete}
          onCancel={() => setConfirmBulkDelete(false)}
          loading={bulkDeleting}
        />
      )}
    </div>
  );
}
