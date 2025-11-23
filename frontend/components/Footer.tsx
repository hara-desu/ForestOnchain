export default function Footer() {
  return (
    <footer className="w-full mt-16 border-t pt-5 pb-10 text-center text-sm text-gray-600">
      <div className="space-y-2">

        {/* Author + Social Links */}
        <p>
          Built by{" "}
          <a
            href="https://x.com/konyangichu"
            target="_blank"
            className="text-emerald-600 hover:underline"
          >
            @konyangichu
          </a>{" "}
          ·{" "}
          <a
            href="https://github.com/hara-desu/ForestOnchain"
            target="_blank"
            className="text-emerald-600 hover:underline"
          >
            GitHub
          </a>
        </p>

        {/* Email */}
        <p>
          Contact:{" "}
          <a
            href="mailto:hzhz10702@gmail.com"
            className="text-emerald-600 hover:underline"
          >
            hzhz1070@gmail.com
          </a>
        </p>

        {/* Contract link */}
        <p>
          Contract (Sepolia):{" "}
          <a
            href="https://sepolia.etherscan.io/address/0xB48e40b165A4cC7A54A955888E5232B6c4f05bdb"
            target="_blank"
            className="font-mono text-emerald-600 hover:underline"
          >
            0xB48e40b165A4cC7A54A955888E5232B6c4f05bdb
          </a>
        </p>
      </div>
    </footer>
  );
}
