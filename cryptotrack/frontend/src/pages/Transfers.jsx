import React, { useEffect, useState } from "react";
import { usePortfolioStore } from "../store";
import {
  CoinBadge,
  DirectionBadge,
  WalletTypeBadge,
  useFmt,
  fmt,
  Spinner,
  Empty,
  ConfirmDialog,
  COINS,
} from "../components/ui";
import TransferModal from "../components/TransferModal";

export default function Transfers() {
  const {
    transfers,
    fetchTransfers,
    deleteTransfer,
    deleteTransfersBulk,
    loading,
  } = usePortfolioStore();

  const { fmtMoney, fmtBtc } = useFmt();

  const [modal, setModal] = useState(false);
  const [assetFilter, setAssetFilter] = useState("Todos");
  const [hashSearch, setHashSearch] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [selected, setSelected] = useState([]);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    fetchTransfers();
  }, []);

  const filtered = transfers.filter((t) => {
    if (assetFilter !== "Todos" && t.asset !== assetFilter) return false;

    if (
      hashSearch &&
      !(t.tx_hash || "").toLowerCase().includes(hashSearch.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  useEffect(() => {
    setSelected((prev) =>
      prev.filter((id) => filtered.some((t) => t.id === id)),
    );
  }, [assetFilter, hashSearch]);

  async function handleDelete(id) {
    if (!confirm("Remover esta transferência?")) return;

    setDeleting(id);

    try {
      await deleteTransfer(id);
    } finally {
      setDeleting(null);
    }
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      await deleteTransfersBulk(selected);
      setSelected([]);
    } finally {
      setBulkDeleting(false);
      setConfirmBulkDelete(false);
    }
  }

  function fmtQty(sym, qty) {
    if (sym === "BTC") return fmtBtc(qty);
    return fmt(qty, 6);
  }

  function toggle(id) {
    setSelected((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }

      return [...prev, id];
    });
  }

  function toggleAll() {
    if (filtered.length > 0 && selected.length === filtered.length) {
      setSelected([]);
      return;
    }

    setSelected(filtered.map((t) => t.id));
  }

  function copyHash(hash) {
    if (!hash) return;
    navigator.clipboard?.writeText(hash);
  }

  const assetOptions = ["Todos", ...COINS];

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Transferências</h1>

          <p className="text-sm text-zinc-500 mt-0.5">
            {transfers.length} registros
          </p>
        </div>

        <button className="btn btn-primary" onClick={() => setModal(true)}>
          <i className="ti ti-plus" />
          Nova transferência
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <select
          className="input w-40"
          value={assetFilter}
          onChange={(e) => setAssetFilter(e.target.value)}
        >
          {assetOptions.map((a) => (
            <option key={a} value={a}>
              {a === "Todos" ? "Todos os ativos" : a}
            </option>
          ))}
        </select>

        <div className="relative">
          <i className="ti ti-search absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-sm" />

          <input
            className="input pl-9 w-64"
            placeholder="Filtrar por TX Hash..."
            value={hashSearch}
            onChange={(e) => setHashSearch(e.target.value)}
          />
        </div>

        {selected.length > 0 && (
          <button
            className="btn btn-danger"
            onClick={() => setConfirmBulkDelete(true)}
          >
            <i className="ti ti-trash" />
            Excluir Selecionados ({selected.length})
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th>
                <input
                  type="checkbox"
                  checked={
                    filtered.length > 0 && selected.length === filtered.length
                  }
                  onChange={toggleAll}
                />
              </th>

              <th>Data</th>
              <th>Tipo</th>
              <th>Ativo</th>
              <th>Quantidade</th>
              <th>Carteira</th>
              <th>Hardwallet</th>
              <th>Exchange / Origem-Destino</th>
              <th>Taxa</th>
              <th>TX Hash</th>
              <th>Obs.</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={12}>
                  <Spinner />
                </td>
              </tr>
            ) : filtered.length ? (
              filtered.map((t) => (
                <tr key={t.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selected.includes(t.id)}
                      onChange={() => toggle(t.id)}
                    />
                  </td>

                  <td className="muted text-xs">{t.date}</td>

                  <td>
                    <DirectionBadge direction={t.direction} />
                  </td>

                  <td>
                    <div className="flex items-center gap-2">
                      <CoinBadge symbol={t.asset} size={22} />
                      <span className="font-medium">{t.asset}</span>
                    </div>
                  </td>

                  <td className="font-mono text-xs">
                    {fmtQty(t.asset, t.qty)}
                  </td>

                  <td>
                    <WalletTypeBadge type={t.wallet_type} />
                  </td>

                  <td className="text-xs">{t.hardwallet}</td>

                  <td className="muted text-xs">{t.counterparty || "—"}</td>

                  <td className="font-mono text-xs muted">{fmtMoney(t.fee)}</td>

                  <td className="text-xs">
                    {t.tx_hash ? (
                      <button
                        className="flex items-center gap-1 font-mono text-zinc-400 hover:text-zinc-200 transition-colors"
                        title={t.tx_hash}
                        onClick={() => copyHash(t.tx_hash)}
                      >
                        <span className="max-w-24 truncate">{t.tx_hash}</span>
                        <i className="ti ti-copy text-xs" />
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>

                  <td className="muted text-xs max-w-24 truncate" title={t.obs}>
                    {t.obs || "—"}
                  </td>

                  <td>
                    <button
                      className="btn btn-danger p-1.5"
                      onClick={() => handleDelete(t.id)}
                      disabled={deleting === t.id}
                    >
                      <i
                        className={`ti ${
                          deleting === t.id
                            ? "ti-loader-2 animate-spin"
                            : "ti-trash"
                        } text-sm`}
                      />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={12}>
                  <Empty text="Nenhuma transferência encontrada." />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <TransferModal
          onClose={() => {
            setModal(false);
            fetchTransfers();
          }}
        />
      )}

      {confirmBulkDelete && (
        <ConfirmDialog
          title="Excluir transferências"
          message={`Tem certeza que deseja excluir ${selected.length} transferência(s) selecionada(s)? Essa ação não pode ser desfeita.`}
          confirmLabel={`Excluir ${selected.length}`}
          onConfirm={handleBulkDelete}
          onCancel={() => setConfirmBulkDelete(false)}
          loading={bulkDeleting}
        />
      )}
    </div>
  );
}
