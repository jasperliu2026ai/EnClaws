/**
 * Tenant overview dashboard — enterprise-level summary for tenant owner/members.
 *
 * Shows agent count, token usage, active channels, user count, and recent activity.
 */

import { html, css, LitElement, nothing } from "lit";
import { customElement, state, property } from "lit/decorators.js";
import { t, I18nController } from "../../../i18n/index.ts";
import { tenantRpc } from "./rpc.ts";

interface TenantSummary {
  agents: { total: number; active: number };
  channels: { total: number; active: number };
  users: { total: number; active30d: number };
  monthTokens: { input: number; output: number; total: number };
  recentTraces: Array<{
    agentName: string;
    userName: string;
    model: string;
    tokens: number;
    createdAt: string;
  }>;
}

@customElement("tenant-overview-view")
export class TenantOverviewView extends LitElement {
  private i18nCtrl = new I18nController(this);

  static styles = css`
    :host {
      display: block;
      padding: 1.5rem;
      color: var(--text, #e5e5e5);
      font-family: var(--font-sans, system-ui, sans-serif);
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }
    .page-header h2 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
    }
    .btn {
      padding: 0.45rem 0.9rem;
      border: none;
      border-radius: var(--radius-md, 6px);
      font-size: 0.85rem;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn:hover { opacity: 0.85; }
    .btn-outline {
      background: transparent;
      border: 1px solid var(--border, #262626);
      color: var(--text, #e5e5e5);
    }

    .summary-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 1rem;
      margin-bottom: 1.5rem;
    }
    .summary-card {
      background: var(--card, #141414);
      border: 1px solid var(--border, #262626);
      border-radius: var(--radius-lg, 8px);
      padding: 1.25rem;
    }
    .summary-label {
      font-size: 0.8rem;
      color: var(--text-secondary, #a3a3a3);
      margin-bottom: 0.35rem;
    }
    .summary-value {
      font-size: 1.6rem;
      font-weight: 700;
    }
    .summary-sub {
      font-size: 0.75rem;
      color: var(--text-muted, #525252);
      margin-top: 0.25rem;
    }

    .section {
      background: var(--card, #141414);
      border: 1px solid var(--border, #262626);
      border-radius: var(--radius-lg, 8px);
      padding: 1.25rem;
      margin-bottom: 1rem;
    }
    .section-title {
      font-size: 0.95rem;
      font-weight: 600;
      margin: 0 0 1rem;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    th {
      text-align: left;
      padding: 0.5rem 0.75rem;
      font-weight: 500;
      color: var(--text-secondary, #a3a3a3);
      border-bottom: 1px solid var(--border, #262626);
    }
    td {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--border, #1a1a1a);
    }

    .loading {
      text-align: center;
      padding: 3rem;
      color: var(--text-muted, #525252);
    }
    .error-msg {
      background: #2d1215;
      border: 1px solid #7f1d1d;
      border-radius: 6px;
      color: #fca5a5;
      padding: 0.5rem 0.75rem;
      font-size: 0.8rem;
      margin-bottom: 1rem;
    }
    .empty {
      text-align: center;
      padding: 2rem;
      color: var(--text-muted, #525252);
      font-size: 0.85rem;
    }
  `;

  @property({ type: String }) gatewayUrl = "";
  @state() private loading = true;
  @state() private error = "";
  @state() private summary: TenantSummary | null = null;

  connectedCallback() {
    super.connectedCallback();
    void this.load();
  }

  private async load() {
    this.loading = true;
    this.error = "";
    try {
      const result = await tenantRpc("tenant.overview", {}, this.gatewayUrl) as TenantSummary;
      this.summary = result;
    } catch {
      // Backend not implemented yet — show mock data
      this.summary = {
        agents: { total: 0, active: 0 },
        channels: { total: 0, active: 0 },
        users: { total: 0, active30d: 0 },
        monthTokens: { input: 0, output: 0, total: 0 },
        recentTraces: [],
      };
    } finally {
      this.loading = false;
    }
  }

  private formatNumber(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return String(n);
  }

  render() {
    return html`
      <div class="page-header">
        <h2>${t("tenantOverview.title")}</h2>
        <button class="btn btn-outline" @click=${() => this.load()}>${t("tenantOverview.refresh")}</button>
      </div>

      ${this.error ? html`<div class="error-msg">${this.error}</div>` : nothing}

      ${this.loading ? html`<div class="loading">${t("tenantOverview.loading")}</div>` : this.summary ? this.renderDashboard() : nothing}
    `;
  }

  private renderDashboard() {
    const s = this.summary!;
    return html`
      <div class="summary-row">
        <div class="summary-card">
          <div class="summary-label">${t("tenantOverview.agents")}</div>
          <div class="summary-value">${s.agents.total}</div>
          <div class="summary-sub">${t("tenantOverview.active")}: ${s.agents.active}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">${t("tenantOverview.channels")}</div>
          <div class="summary-value">${s.channels.total}</div>
          <div class="summary-sub">${t("tenantOverview.active")}: ${s.channels.active}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">${t("tenantOverview.users")}</div>
          <div class="summary-value">${s.users.total}</div>
          <div class="summary-sub">${t("tenantOverview.active30d")}: ${s.users.active30d}</div>
        </div>
        <div class="summary-card">
          <div class="summary-label">${t("tenantOverview.monthTokens")}</div>
          <div class="summary-value">${this.formatNumber(s.monthTokens.total)}</div>
          <div class="summary-sub">${t("tenantOverview.input")}: ${this.formatNumber(s.monthTokens.input)} / ${t("tenantOverview.output")}: ${this.formatNumber(s.monthTokens.output)}</div>
        </div>
      </div>

      <div class="section">
        <h3 class="section-title">${t("tenantOverview.recentActivity")}</h3>
        ${s.recentTraces.length > 0 ? html`
          <table>
            <thead>
              <tr>
                <th>Agent</th>
                <th>${t("tenantOverview.user")}</th>
                <th>${t("tenantOverview.model")}</th>
                <th>Tokens</th>
                <th>${t("tenantOverview.time")}</th>
              </tr>
            </thead>
            <tbody>
              ${s.recentTraces.map(tr => html`
                <tr>
                  <td>${tr.agentName}</td>
                  <td>${tr.userName}</td>
                  <td>${tr.model}</td>
                  <td>${this.formatNumber(tr.tokens)}</td>
                  <td>${new Date(tr.createdAt).toLocaleString()}</td>
                </tr>
              `)}
            </tbody>
          </table>
        ` : html`<div class="empty">${t("tenantOverview.noActivity")}</div>`}
      </div>
    `;
  }
}
