import { Alchemy, Network } from 'alchemy-sdk';
import { useEffect, useState } from 'react';
import Modal from 'react-modal';
import './index.css';  // Tailwind imports

Modal.setAppElement('#root');
const settings = {
  apiKey: 'Ek4JnrvNd4jvjcj8nWnLxMxabJsN871o',
  network: Network.ETH_MAINNET,
};

const alchemy = new Alchemy(settings);

function App() {
  const [query, setQuery] = useState('');
  const [blockNumber, setBlockNumber] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [timestamp, setTimestamp] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedTx, setSelectedTx] = useState(null);

  // Fetch latest block on mount or refresh
  async function fetchLatestBlock() {
    setLoading(true);
    try {
      const latest = await alchemy.core.getBlockNumber();
      await fetchBlock(latest);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  // Fetch arbitrary block, address, or tx
  async function fetchBlock(input) {
    setLoading(true);
    setPage(1);
    try {
      // If numeric → block, if 0x…64 hex → tx, else treat as address
      if (/^\d+$/.test(input)) {
        const num = Number(input);
        const blk = await alchemy.core.getBlockWithTransactions(num);
        setTransactions(blk.transactions);
        setTimestamp(new Date(blk.timestamp * 1000).toLocaleString());
        setBlockNumber(num);
      }  if (/^0x[a-fA-F0-9]{64}$/.test(input)) {
        const tx = await alchemy.core.getTransaction(input);
        setTransactions([tx]);
        setTimestamp('N/A');
        setBlockNumber(tx.blockNumber);
      }  if (/^0x[a-fA-F0-9]{40}$/.test(input)) {
        const txs = await alchemy.core.getTransactionsForAddress(input, {
          pageKey: null,
          maxCount: 100,
        });
        setTransactions(txs);
        setTimestamp('N/A');
        setBlockNumber('Address');
      } else {
        throw new Error('Invalid input');
      }
    } catch (err) {
      console.error(err);
      setTransactions([]);
      setTimestamp(null);
      setBlockNumber(null);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchLatestBlock();
  }, []);

  // Pagination slice
  const pageSize = 10;
  const totalPages = Math.ceil(transactions.length / pageSize);
  const pageTxs = transactions.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 p-6">
      <header className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Mini Etherscan</h1>
        <div className="flex space-x-2 mt-4 sm:mt-0">
          <input
            className="px-3 py-2 rounded border focus:outline-none focus:ring w-60"
            type="text"
            placeholder="Block #, Tx hash or Address"
            value={query}
            onChange={(e) => setQuery(e.target.value.trim())}
            onKeyDown={(e) => e.key === 'Enter' && fetchBlock(query)}
          />
          <button
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
            onClick={() => (query ? fetchBlock(query) : fetchLatestBlock())}
            disabled={loading}
          >
            {loading ? '⏳' : '🔍'}
          </button>
        </div>
      </header>

      <section className="max-w-3xl mx-auto mb-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded shadow flex flex-col sm:flex-row justify-between">
          <div>
            <p className="text-sm">Block:</p>
            <p className="font-mono">{blockNumber ?? '—'}</p>
          </div>
          <div>
            <p className="text-sm">Timestamp:</p>
            <p>{timestamp ?? '—'}</p>
          </div>
          <button
            className="mt-3 sm:mt-0 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
            onClick={fetchLatestBlock}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </section>

      <main className="max-w-3xl mx-auto">
        {loading && <p className="text-center">Loading...</p>}

        {!loading && transactions.length === 0 && (
          <p className="text-center text-red-500">No transactions found.</p>
        )}

        {!loading && transactions.length > 0 && (
          <>
            <ul>
              {pageTxs.map((tx) => (
                <li
                  key={tx.hash}
                  className="bg-white dark:bg-gray-800 p-4 rounded shadow mb-4 cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900 transition"
                  onClick={() => setSelectedTx(tx)}
                >
                  <div className="flex justify-between">
                    <span className="font-mono truncate w-36">{tx.hash}</span>
                    <span className="text-indigo-600 font-bold">
                      {(Number(tx.value) / 1e18).toFixed(4)} ETH
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    From: {tx.from} → To: {tx.to || 'Contract Creation'}
                  </div>
                </li>
              ))}
            </ul>

            {/* Pagination */}
            <nav className="flex justify-center space-x-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 bg-gray-300 dark:bg-gray-700 rounded"
              >
                Prev
              </button>
              <span className="px-3 py-1">{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 bg-gray-300 dark:bg-gray-700 rounded"
              >
                Next
              </button>
            </nav>
          </>
        )}
      </main>

      {/* Transaction Detail Modal */}
      {selectedTx && (
        <Modal
          isOpen
          onRequestClose={() => setSelectedTx(null)}
          className="max-w-xl mx-auto mt-24 bg-white dark:bg-gray-800 p-6 rounded shadow-lg outline-none"
          overlayClassName="fixed inset-0 bg-black bg-opacity-50"
        >
          <h2 className="text-xl font-bold mb-4">Transaction Details</h2>
          <pre className="text-sm font-mono bg-gray-100 dark:bg-gray-700 p-4 rounded overflow-auto">
            {JSON.stringify(selectedTx, null, 2)}
          </pre>
          <button
            className="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
            onClick={() => setSelectedTx(null)}
          >
            Close
          </button>
        </Modal>
      )}
    </div>
  );
}

export default App;