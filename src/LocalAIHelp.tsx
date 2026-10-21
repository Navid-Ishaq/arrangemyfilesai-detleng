import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
export function LocalAIHelp({ expanded = false }: { expanded?: boolean }) {
  const [copied, setCopied] = useState(false);
  const command = `[Environment]::SetEnvironmentVariable('OLLAMA_ORIGINS', ((@(([Environment]::GetEnvironmentVariable('OLLAMA_ORIGINS','User') -split ',') + 'https://arrangemyfilesai.detleng.com') | Where-Object { $_.Trim() } | Select-Object -Unique) -join ','), 'User')`;
  return (
    <details className="local-ai-help" open={expanded || undefined}>
      <summary>Connect this website to your local AI · Windows setup</summary>
      <div>
        <p>
          <strong>Choose folder</strong> reads files locally.{" "}
          <strong>Check local AI</strong> connects this page to the Ollama app
          on your computer. Neither step uploads documents to the website.
        </p>
        <ol>
          <li>Start Ollama from the Windows Start menu.</li>
          <li>
            Allow the official DeTLeng site once. Copy this command into
            PowerShell and press Enter. It preserves other configured origins
            and adds only <code>https://arrangemyfilesai.detleng.com</code>.
          </li>
        </ol>
        <div className="setup-command">
          <code>{command}</code>
          <button
            aria-label="Copy Ollama website permission command"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(command);
                setCopied(true);
              } catch {
                setCopied(false);
              }
            }}
          >
            {copied ? <Check size={17} /> : <Copy size={17} />}
          </button>
        </div>
        <p>
          You can also{" "}
          <a href="/connect-local-ai.cmd" download>
            download the Windows setup helper
          </a>
          . It asks before changing the same setting and can restart Ollama
          automatically. No administrator access, wildcard origins, or firewall
          changes are needed.
        </p>
        <ol start={3}>
          <li>
            In the Windows tray, right-click Ollama and choose Quit. Open Ollama
            again from Start. Existing Ollama must be restarted to load the
            setting.
          </li>
          <li>
            Return to this page and select <strong>Check local AI</strong>. If
            Chrome/Edge asks to access the local network, allow it for this
            site. If previously blocked, review the site's browser permissions.
          </li>
        </ol>
        <p>
          Still blocked? Open{" "}
          <a href="http://127.0.0.1:11434" target="_blank" rel="noreferrer">
            Ollama status <ExternalLink size={12} />
          </a>
          . A running service normally says “Ollama is running”. Browser network
          failures cannot always distinguish a stopped service from a blocked
          permission.
        </p>
        <p className="muted">
          This is a one-time setting on each user's computer. Publishing a
          website does not install Ollama or grant local permissions for
          visitors. The online AI Guide is a separate service and does not
          enable document analysis.
        </p>
      </div>
    </details>
  );
}
