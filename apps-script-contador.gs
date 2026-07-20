// Contador de escolhas + mural de recados — luizaehenrique.com.br
// Cole este código em script.google.com (mesmo projeto de antes) e crie uma
// NOVA versão do deployment existente (Implantar > Gerenciar implantações >
// editar > Nova versão) pra manter a mesma URL que já está no site.

const PROP = PropertiesService.getScriptProperties();
const CHAVE_ADMIN = "troque-por-uma-senha-sua"; // defina algo só seu antes de implantar

function doGet(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(5000);
  try {
    const acao = (e && e.parameter && e.parameter.acao) || 'lista';

    if (acao === 'escolha') {
      const id = parseInt(e.parameter.id, 10);
      if (!isNaN(id) && id >= 0 && id < 100) {
        const chave = String(id);
        const atual = Number(PROP.getProperty(chave) || 0) + 1;
        PROP.setProperty(chave, String(atual));
      }
      return jsonOut(PROP.getProperties());
    }

    if (acao === 'mural') {
      const aprovados = getMural()
        .filter(m => m.status === 'aprovado')
        .sort((a, b) => b.ts - a.ts)
        .map(m => ({ nome: m.nome, mensagem: m.mensagem, ts: m.ts }));
      return jsonOut(aprovados);
    }

    if (acao === 'painel') {
      return htmlOut(painelHtml(e.parameter.chave || ''));
    }

    if (acao === 'aprovar' || acao === 'rejeitar') {
      if (e.parameter.chave !== CHAVE_ADMIN) return htmlOut('<p>Senha incorreta.</p>');
      const mural = getMural();
      const idx = mural.findIndex(m => m.id === e.parameter.id);
      if (idx >= 0) {
        if (acao === 'aprovar') mural[idx].status = 'aprovado';
        else mural.splice(idx, 1);
        setMural(mural);
      }
      return HtmlService.createHtmlOutput(
        `<script>location.href="?acao=painel&chave=${encodeURIComponent(e.parameter.chave)}"</script>`
      );
    }

    return jsonOut(PROP.getProperties());
  } finally {
    lock.releaseLock();
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(5000);
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.acao === 'recado') {
      const nome = String(body.nome || '').slice(0, 60).trim();
      const mensagem = String(body.mensagem || '').slice(0, 500).trim();
      if (!nome || !mensagem) return jsonOut({ ok: false, erro: 'campos vazios' });
      const mural = getMural();
      mural.push({
        id: Utilities.getUuid(),
        nome,
        mensagem,
        ts: Date.now(),
        status: 'aprovado' // vai direto ao ar, sem moderação
      });
      setMural(mural);
      return jsonOut({ ok: true });
    }
    return jsonOut({ ok: false, erro: 'ação inválida' });
  } finally {
    lock.releaseLock();
  }
}

function getMural() {
  const raw = PROP.getProperty('MURAL');
  return raw ? JSON.parse(raw) : [];
}
function setMural(arr) {
  PROP.setProperty('MURAL', JSON.stringify(arr));
}
function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function htmlOut(html) {
  return HtmlService.createHtmlOutput(html);
}

// painel simples de moderação — acesse pelo link:
// SUA_URL_DO_APP?acao=painel&chave=SUA_SENHA
function painelHtml(chave) {
  if (chave !== CHAVE_ADMIN) {
    return '<p style="font-family:sans-serif">Adicione <code>&chave=SUA_SENHA</code> na URL (a mesma que você definiu em CHAVE_ADMIN no código).</p>';
  }
  const base = ScriptApp.getService().getUrl();
  const mural = getMural();
  const pendentes = mural.filter(m => m.status === 'pendente');
  const aprovados = mural.filter(m => m.status === 'aprovado');

  const linha = (m, mostrarAcoes) => `
    <div style="border:1px solid #e3d5be;border-radius:10px;padding:14px;margin-bottom:10px;font-family:sans-serif">
      <div style="font-weight:600;color:#7E3231">${escapeHtml(m.nome)}</div>
      <div style="margin:6px 0;color:#3A2E2A">${escapeHtml(m.mensagem)}</div>
      <div style="font-size:12px;color:#7A6A60">${new Date(m.ts).toLocaleString('pt-BR')}</div>
      ${mostrarAcoes ? `
        <div style="margin-top:8px">
          <a href="${base}?acao=aprovar&id=${m.id}&chave=${encodeURIComponent(chave)}"
             style="color:#877B3D;font-weight:600;text-decoration:none;margin-right:16px">✓ Aprovar</a>
          <a href="${base}?acao=rejeitar&id=${m.id}&chave=${encodeURIComponent(chave)}"
             style="color:#7E3231;font-weight:600;text-decoration:none">✕ Excluir</a>
        </div>` : ''}
    </div>`;

  return `
    <html><body style="max-width:600px;margin:30px auto;padding:0 16px">
      <h2 style="font-family:sans-serif;color:#7E3231">Recados pendentes (${pendentes.length})</h2>
      ${pendentes.length ? pendentes.map(m => linha(m, true)).join('') : '<p style="font-family:sans-serif;color:#7A6A60">Nenhum recado esperando aprovação.</p>'}
      <h2 style="font-family:sans-serif;color:#7E3231;margin-top:30px">Já aprovados (${aprovados.length})</h2>
      ${aprovados.length ? aprovados.map(m => linha(m, false)).join('') : '<p style="font-family:sans-serif;color:#7A6A60">Nenhum ainda.</p>'}
    </body></html>`;
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
}

// Opcional: rode esta função no editor para zerar o contador de escolhas
// (mantém o mural intacto)
function zerarContadores() {
  const props = PROP.getProperties();
  Object.keys(props).forEach(k => { if (k !== 'MURAL') PROP.deleteProperty(k); });
}
