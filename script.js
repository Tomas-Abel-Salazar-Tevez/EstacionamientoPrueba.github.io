let autos = JSON.parse(localStorage.getItem('autos')) || [];
let historial = JSON.parse(localStorage.getItem('historial')) || [];

if (localStorage.getItem('temaOscuro') === 'true') {
  document.body.classList.add('oscuro');
}

renderizar();

function agregarAuto() {
  const matricula = document.getElementById('matricula').value.trim();
  if (!matricula) return alert("Ingrese una matrícula.");
  const entrada = Date.now();
  autos.push({ matricula, entrada });
  guardar();
  renderizar();
  document.getElementById('matricula').value = "";
}

function listoSeFue(index) {
  const auto = autos[index];
  const salida = Date.now();
  const tiempo = Math.ceil((salida - auto.entrada) / 60000);
  let precio = 0;

  if (tiempo <= 30) precio = 1500;
  else if (tiempo <= 60) precio = 2000;
  else if (tiempo >= 480) precio = 8000;
  else precio = 2000 + Math.ceil((tiempo - 60) / 30) * 1500;

  const fecha = new Date(auto.entrada).toLocaleDateString();
  let dia = historial.find(h => h.fecha === fecha);
  if (!dia) {
    dia = { fecha, autos: [] };
    historial.push(dia);
  }

  dia.autos.push({
    matricula: auto.matricula,
    entrada: new Date(auto.entrada).toLocaleTimeString(),
    salida: new Date(salida).toLocaleTimeString(),
    tiempo,
    precio
  });

  autos.splice(index, 1);
  guardar();
  renderizar();
}

function guardar() {
  localStorage.setItem('autos', JSON.stringify(autos));
  localStorage.setItem('historial', JSON.stringify(historial));
}

function renderizar() {
  renderizarAutos();
  renderizarHistorial();
}

function renderizarAutos() {
  const contenedor = document.getElementById('autos');
  contenedor.innerHTML = '';
  autos.forEach((auto, i) => {
    const div = document.createElement('div');
    div.className = 'auto';
    const minutos = Math.floor((Date.now() - auto.entrada) / 60000);
    div.style.backgroundColor =
      minutos <= 30 ? '#e0ffe0' : minutos <= 60 ? '#fffacc' : '#ffe0e0';

    const info = document.createElement('div');
    info.className = 'info';
    info.innerHTML = `<strong>${auto.matricula}</strong><br>Entrada: ${new Date(auto.entrada).toLocaleTimeString()}<br><span id="cronometro-${i}"></span>`;

    const btn = document.createElement('button');
    btn.innerText = 'Listo, se fue';
    btn.onclick = () => listoSeFue(i);

    div.appendChild(info);
    div.appendChild(btn);
    contenedor.appendChild(div);
    actualizarCronometro(i, auto.entrada);
  });
  document.getElementById('contador-autos').innerText = autos.length;
}

function actualizarCronometro(i, entrada) {
  const el = document.getElementById(`cronometro-${i}`);
  const intervalId = setInterval(() => {
    const ahora = Date.now();
    const ms = ahora - entrada;
    const minutos = Math.floor(ms / 60000);
    const segundos = Math.floor((ms % 60000) / 1000);
    if (el) el.innerText = `Tiempo: ${minutos}m ${segundos.toString().padStart(2, '0')}s`;
    else clearInterval(intervalId);
  }, 1000);
}

function renderizarHistorial() {
  const contenedor = document.getElementById('historial');
  contenedor.innerHTML = '';
  const hoy = new Date().toLocaleDateString();
  let totalHoy = 0;

  historial.forEach((dia, diaIndex) => {
    const tabla = document.createElement('table');
    tabla.innerHTML = `
      <thead>
        <tr>
          <th>Matrícula</th>
          <th>Entrada</th>
          <th>Salida</th>
          <th>Tiempo</th>
          <th>Precio</th>
          <th>❌</th>
        </tr>
      </thead>
      <tbody>
        ${dia.autos.map((auto, autoIndex) => {
          if (dia.fecha === hoy) totalHoy += auto.precio;
          return `
            <tr>
              <td>${auto.matricula}</td>
              <td>${auto.entrada}</td>
              <td>${auto.salida}</td>
              <td>${auto.tiempo} min</td>
              <td>$${auto.precio}</td>
              <td><button class="rojo" onclick="eliminarAutoHistorial(${diaIndex}, ${autoIndex})">X</button></td>
            </tr>`;
        }).join('')}
      </tbody>`;
    const titulo = document.createElement('h3');
    titulo.textContent = `📅 ${dia.fecha}`;
    contenedor.appendChild(titulo);
    contenedor.appendChild(tabla);
  });

  document.getElementById('total').innerText = `$${totalHoy}`;
}


function generarPDF() {
  if (!window.jsPDF || !jsPDF.API.autoTable) {
    alert("jsPDF o autoTable no están cargados correctamente.");
    return;
  }

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Historial de Estacionamiento", 105, 15, { align: "center" });

  let y = 25;

  historial.forEach(dia => {
    doc.setFontSize(12);
    doc.text(`Fecha: ${dia.fecha}`, 10, y);
    y += 6;

    const data = dia.autos.map(auto => [
      auto.matricula,
      auto.entrada,
      auto.salida,
      `${auto.tiempo} min`,
      `$${auto.precio}`
    ]);

    doc.autoTable({
      head: [["Matrícula", "Entrada", "Salida", "Tiempo", "Precio"]],
      body: data,
      startY: y,
      theme: 'grid',
      headStyles: { fillColor: [100, 149, 237], textColor: 255 },
      styles: { fontSize: 10 }
    });

    y = doc.lastAutoTable.finalY + 10;
    if (y > 260) {
      doc.addPage();
      y = 20;
    }
  });

  doc.save("historial_aparcamiento.pdf");
}

function toggleTema() {
  document.body.classList.toggle('oscuro');
  localStorage.setItem('temaOscuro', document.body.classList.contains('oscuro'));
}

function eliminarAutoHistorial(diaIndex, autoIndex) {
  if (confirm("¿Seguro que deseas eliminar este registro del historial?")) {
    historial[diaIndex].autos.splice(autoIndex, 1);
    // Si ya no hay autos en ese día, eliminar el día entero:
    if (historial[diaIndex].autos.length === 0) {
      historial.splice(diaIndex, 1);
    }
    guardar();
    renderizar();
  }
}
