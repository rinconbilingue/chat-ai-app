let chatHistory = [];
const chat = document.getElementById('chat');
const messageInput = document.getElementById('message');
let pastedImageBase64 = null;

document.addEventListener('paste', (event) => {
  const items = event.clipboardData.items;
  for (let item of items) {
    if (item.type.indexOf('image') !== -1) {
      const file = item.getAsFile();
      const reader = new FileReader();
      reader.onload = () => {
        pastedImageBase64 = reader.result;
        document.getElementById("imagePreviewThumb").src = pastedImageBase64;
        document.getElementById("imagePreviewContainer").style.display = "inline-block";
      };
      reader.readAsDataURL(file);
    }
  }
});

function eliminarImagenPegada() {
  pastedImageBase64 = null;
  document.getElementById("imagePreviewContainer").style.display = "none";
  document.getElementById("imagePreviewThumb").src = "";
}

function appendMessage(sender, text, role) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.innerHTML = `<strong>${sender}:</strong><br>${text}`;
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  MathJax.typeset();
}

async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message && !pastedImageBase64) return;

  const tempImage = pastedImageBase64;
  const tempMessage = message;

  if (tempMessage) appendMessage('Tú', tempMessage, 'user');
  if (tempImage) {
    appendMessage('Tú (imagen)', `<img src="${tempImage}" style="max-width: 100%">`, 'user');
  }

  messageInput.value = '';
  eliminarImagenPegada();

  let newEntry = {
    role: 'user',
    content: [
      ...(tempMessage ? [{ type: 'text', text: tempMessage }] : []),
      ...(tempImage ? [{ type: 'image_url', image_url: { url: tempImage, detail: 'auto' } }] : [])
    ]
  };

  chatHistory.push(newEntry);

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history: chatHistory })
  });

  const data = await res.json();
  appendMessage('IA', data.response, 'ai');
  chatHistory.push({
    role: 'assistant',
    content: [{ type: 'text', text: data.response }]
  });
}

async function capturarPantalla() {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: { mediaSource: "screen" }
    });

    const video = document.createElement("video");
    video.srcObject = stream;
    await video.play();

    const canvas = document.getElementById("previewCanvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    stream.getTracks().forEach(track => track.stop());
  } catch (err) {
    if (err.name !== 'NotAllowedError') {
      alert("Error al capturar pantalla: " + err);
    }
    // Si fue cancelado por el usuario, simplemente no hacemos nada
  }
}


async function copiarImagen() {
  const canvas = document.getElementById("previewCanvas");
  if (!canvas.width || !canvas.height) {
    alert("Primero toma una captura.");
    return;
  }

  try {
    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
    await navigator.clipboard.write([
      new ClipboardItem({ "image/png": blob })
    ]);
    alert("Imagen copiada al portapapeles ✅");
  } catch (err) {
    alert("No se pudo copiar la imagen: " + err);
  }
}

async function enviarCaptura() {
  let textoExtra = document.getElementById("textoExtra").value.trim();
  const canvas = document.getElementById('previewCanvas');

  if (!canvas || !canvas.width || !canvas.height) {
    alert("Primero toma una captura.");
    return;
  }

  const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
  const imageBase64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  appendMessage('Tú (captura)', `<img src="${imageBase64}" style="max-width: 100%">`, 'user');
  if (textoExtra) {
    appendMessage('Tú', textoExtra, 'user');
  }

  // Si no hay texto, no lo mostramos pero lo enviamos internamente
  const mensajeOculto = textoExtra || "Please solve this briefly, just the answer.";

  // Agregar al historial
  chatHistory.push({
    role: 'user',
    content: [
      { type: 'text', text: mensajeOculto },
      { type: 'image_url', image_url: { url: imageBase64, detail: 'auto' } }
    ]
  });

  document.getElementById("textoExtra").value = "";

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ history: chatHistory })
  });

  const data = await res.json();
  appendMessage('IA', data.response, 'ai');
  chatHistory.push({
    role: 'assistant',
    content: [{ type: 'text', text: data.response }]
  });
}
