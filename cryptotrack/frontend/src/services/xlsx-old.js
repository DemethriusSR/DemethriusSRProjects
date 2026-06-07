import * as XLSX from 'xlsx'
import api from './api'

// ── EXPORT ──────────────────────────────────────────────
export async function exportTransactionsXLSX() {
  const { data } = await api.get('/export/transactions')
  const { data: defiData } = await api.get('/export/defi')

  const wb = XLSX.utils.book_new()

  // Sheet 1 – Transactions
  const txHeaders = ['Data','Tipo','Ativo','Quantidade','Preço Unit (R$)','Taxa (R$)','Total (R$)','Exchange','Ativo Origem','Qtd Origem','Observações']
  const txRows = data.map(r => [r.date, r.type, r.asset, r.qty, r.price, r.fee, r.total, r.exchange, r.origin_asset, r.origin_qty, r.obs])
  const wsTx = XLSX.utils.aoa_to_sheet([txHeaders, ...txRows])
  wsTx['!cols'] = [10,10,8,14,16,12,14,14,12,12,20].map(w => ({ wch: w }))
  XLSX.utils.book_append_sheet(wb, wsTx, 'Transações')

  // Sheet 2 – DeFi
  const defiHeaders = ['Entrada','Protocolo','Tipo','Ativo','Depositado (R$)','APY (%)','Recompensas (R$)','Saída','Retirado (R$)','Obs']
  const defiRows = defiData.map(r => [r.start_date, r.protocol, r.type, r.asset, r.deposited, r.apy, r.rewards, r.exit_date, r.withdrawn, r.obs])
  const wsDeFi = XLSX.utils.aoa_to_sheet([defiHeaders, ...defiRows])
  XLSX.utils.book_append_sheet(wb, wsDeFi, 'DeFi')

  XLSX.writeFile(wb, `cryptotrack_${new Date().toISOString().split('T')[0]}.xlsx`)
}

// ── TEMPLATE ────────────────────────────────────────────
export function downloadImportTemplate() {
  const wb = XLSX.utils.book_new()

  // ── Aba 1: Transações ──────────────────────────────────
  const txHeaders = [
    'Data', 'Tipo', 'Ativo', 'Quantidade',
    'Preço Unit (R$)', 'Taxa (R$)', 'Exchange',
    'Ativo Origem', 'Qtd Origem', 'Observações'
  ]

  const txExamples = [
    ['2024-01-15', 'Compra', 'BTC',   '0.05',   '220000', '15',  'Binance',  '',    '',     'Primeira compra'],
    ['2024-02-10', 'Compra', 'ETH',   '0.80',   '13000',  '8',   'Binance',  '',    '',     ''],
    ['2024-03-05', 'Compra', 'SOL',   '12',     '600',    '3',   'Foxbit',   '',    '',     ''],
    ['2024-04-20', 'Venda',  'SOL',   '4',      '780',    '5',   'Foxbit',   '',    '',     'Realizando lucro'],
    ['2024-05-01', 'Swap',   'ADA',   '3000',   '2.50',   '2',   'Binance',  'BNB', '1',    'Swap BNB → ADA'],
    ['2024-06-12', 'DeFi',   'ETH',   '0.50',   '15000',  '0',   'Aave',     '',    '',     'Depósito Aave'],
    ['2024-07-30', 'Hold',   'BTC',   '0.02',   '340000', '0',   '',         '',    '',     'Hodl longo prazo'],
  ]

  // Linha de instruções (linha 1 — acima do cabeçalho real)
  const txInstructions = [
    ['=== INSTRUÇÕES ===',
     'Tipo aceito: Compra | Venda | Swap | DeFi | Hold',
     'Ativo: símbolo em maiúsculas (BTC, ETH, SOL...)',
     'Data: formato AAAA-MM-DD',
     'Não altere o cabeçalho da linha 2',
     '', '', '', '', '']
  ]

  const wsTx = XLSX.utils.aoa_to_sheet([...txInstructions, txHeaders, ...txExamples])

  // Larguras das colunas
  wsTx['!cols'] = [12, 10, 8, 13, 16, 10, 14, 12, 11, 22].map(w => ({ wch: w }))

  // Congelar linha de instrução + cabeçalho (linha 3 em diante é editável)
  wsTx['!freeze'] = { xSplit: 0, ySplit: 2 }

  XLSX.utils.book_append_sheet(wb, wsTx, 'Transações')

  // ── Aba 2: DeFi ───────────────────────────────────────
  const defiHeaders = [
    'Data Entrada', 'Protocolo', 'Tipo',
    'Ativo', 'Depositado (R$)', 'APY (%)',
    'Recompensas (R$)', 'Data Saída', 'Retirado (R$)', 'Observações'
  ]

  const defiInstructions = [
    ['=== INSTRUÇÕES ===',
     'Tipo aceito: Staking | Yield Farming | Liquidity Pool',
     'Deixe Data Saída e Retirado em branco se ainda ativo',
     'Data: formato AAAA-MM-DD',
     '', '', '', '', '', '']
  ]

  const defiExamples = [
    ['2024-03-01', 'Aave',        'Staking',        'ETH', '15000', '4.2',  '450',  '',           '',    'Staking ETH na Aave'],
    ['2024-05-10', 'PancakeSwap', 'Yield Farming',  'BNB', '5000',  '18.5', '620',  '',           '',    ''],
    ['2024-06-01', 'Uniswap V3',  'Liquidity Pool', 'ETH', '12000', '11.2', '980',  '',           '',    'Pool ETH/USDC'],
    ['2024-08-15', 'Lido',        'Staking',        'ETH', '8000',  '3.8',  '210',  '2024-11-15', '8800','Encerrado'],
  ]

  const wsDeFi = XLSX.utils.aoa_to_sheet([...defiInstructions, defiHeaders, ...defiExamples])
  wsDeFi['!cols'] = [13, 14, 16, 8, 15, 9, 17, 13, 14, 22].map(w => ({ wch: w }))
  wsDeFi['!freeze'] = { xSplit: 0, ySplit: 2 }
  XLSX.utils.book_append_sheet(wb, wsDeFi, 'DeFi')

  // ── Aba 3: Referência de ativos suportados ─────────────
  const refHeaders = ['Símbolo', 'Nome']
  const refRows = [
    ['BTC','Bitcoin'],['ETH','Ethereum'],['BNB','BNB'],['SOL','Solana'],
    ['ADA','Cardano'],['DOT','Polkadot'],['AVAX','Avalanche'],['MATIC','Polygon'],
    ['LINK','Chainlink'],['XRP','Ripple'],['UNI','Uniswap'],['ATOM','Cosmos'],
    ['LTC','Litecoin'],['DOGE','Dogecoin'],['SHIB','Shiba Inu'],['USDT','Tether'],
    ['USDC','USD Coin'],['TRX','TRON'],['TON','Toncoin'],['PEPE','Pepe'],
  ]
  const wsRef = XLSX.utils.aoa_to_sheet([refHeaders, ...refRows])
  wsRef['!cols'] = [{ wch: 10 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, wsRef, 'Ativos Suportados')

  XLSX.writeFile(wb, 'cryptotrack_template_importacao.xlsx')
}

// ── IMPORT ──────────────────────────────────────────────
export function parseXLSXFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => {
      try {
        const wb  = XLSX.read(e.target.result, { type: 'binary', cellDates: true })
        const ws  = wb.Sheets[wb.SheetNames[0]]
        const raw = XLSX.utils.sheet_to_json(ws, { defval: '' })

        // Normalize column names (handle PT and EN variants)
        const COL_MAP = {
          'Data': 'date', 'Date': 'date',
          'Tipo': 'type', 'Type': 'type',
          'Ativo': 'asset', 'Asset': 'asset', 'Symbol': 'asset',
          'Quantidade': 'qty', 'Qty': 'qty', 'Quantity': 'qty',
          'Preço Unit (R$)': 'price', 'Price': 'price', 'Preço': 'price',
          'Taxa (R$)': 'fee', 'Fee': 'fee', 'Taxa': 'fee',
          'Total (R$)': 'total', 'Total': 'total',
          'Exchange': 'exchange',
          'Ativo Origem': 'origin_asset', 'Observações': 'obs', 'Obs': 'obs',
        }

        const rows = raw.map(r => {
          const out = {}
          for (const [k, v] of Object.entries(r)) {
            const mapped = COL_MAP[k.trim()]
            if (mapped) out[mapped] = v instanceof Date ? v.toISOString().split('T')[0] : String(v).trim()
          }
          return out
        }).filter(r => r.date && r.type && r.asset)

        resolve(rows)
      } catch (err) { reject(err) }
    }
    reader.onerror = reject
    reader.readAsBinaryString(file)
  })
}

export async function importXLSXToServer(file) {
  const rows = await parseXLSXFile(file)
  const { data } = await api.post('/export/transactions', { rows })
  return data
}