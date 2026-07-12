// Contador de escolhas da lista de presentes — luizaehenrique.com.br
// Cole este código em script.google.com (novo projeto) e implante como Web App.

const PROP = PropertiesService.getScriptProperties();

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
    }
    return ContentService
      .createTextOutput(JSON.stringify(PROP.getProperties()))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// Opcional: rode esta função no editor para zerar tudo (ex.: depois dos testes)
function zerarContadores() {
  PROP.deleteAllProperties();
}
