// inicializa
let autos = JSON.parse(localStorage.getItem('autos')) || [];
let historial = JSON.parse(localStorage.getItem('historial')) || [];

// tema oscuro
if (localStorage.getItem('temaOscuro') === 'true') {
  document.body.classList.add('oscuro');
}

renderizar();

// =====================
// funciones principales
// =====================

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

  if (tiempo <= 30) {
    precio = 1500;
  } else if (tiempo <= 60) {
    precio = 2000;
  } else if (tiempo >= 480) {
    precio = 8000;
  } else {
    const extras = Math.ceil((tiempo - 60) / 30);
    precio = 2000 + extras * 1500;
  }

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

function eliminarHistorial(fecha, index) {
  const dia = historial.find(h => h.fecha === fecha);
  if (!dia) return;
  dia.autos.splice(index, 1);
  if (dia.autos.length === 0) {
    historial = historial.filter(h => h.fecha !== fecha);
  }
  guardar();
  renderizar();
}

function guardar() {
  localStorage.setItem('autos', JSON.stringify(autos));
  localStorage.setItem('historial', JSON.stringify(historial));
}

// ======================
// renderizado
// ======================

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
    const info = document.createElement('div');
    info.className = 'info';
    info.innerHTML = `<strong>${auto.matricula}</strong><br>Entrada: ${new Date(auto.entrada).toLocaleTimeString()}<br><span id="cronometro-${i}"></span>`;
    const btn = document.createElement('button');
    btn.className = 'delete-btn';
    btn.innerText = 'Listo, se fue';
    btn.onclick = () => listoSeFue(i);
    div.appendChild(info);
    div.appendChild(btn);
    contenedor.appendChild(div);
    actualizarCronometro(i, auto.entrada);
  });
}

function actualizarCronometro(i, entrada) {
  const el = document.getElementById(`cronometro-${i}`);
  const intervalId = setInterval(() => {
    const ahora = Date.now();
    const ms = ahora - entrada;
    const minutos = Math.floor(ms / 60000);
    const segundos = Math.floor((ms % 60000) / 1000);
    const tiempoTexto = `${minutos}m ${segundos < 10 ? '0' : ''}${segundos}s`;
    if (el) {
      el.innerText = `Tiempo: ${tiempoTexto}`;
    } else {
      clearInterval(intervalId);
    }
  }, 1000);
}

function renderizarHistorial() {
  const contenedor = document.getElementById('historial');
  contenedor.innerHTML = '';
  let totalHoy = 0;
  const hoy = new Date().toLocaleDateString();

  const filtroFecha = document.getElementById('filtroFecha').value;  const rangoDesde = document.getElementById('rangoDesde').value;
  const rangoHasta = document.getElementById('rangoHasta').value;

  const historialFiltrado = historial.filter(dia => {
    const [d, m, y] = dia.fecha.split('/');
    const fechaDia = new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);

    if (filtroFecha) {
      const [yyyy, mm, dd] = filtroFecha.split('-');
      const fechaFiltro = new Date(`${yyyy}-${mm}-${dd}`);
      if (fechaDia.getTime() !== fechaFiltro.getTime()) return false;
    }

    if (rangoDesde) {
      const desde = new Date(rangoDesde);
      if (fechaDia < desde) return false;
    }

    if (rangoHasta) {
      const hasta = new Date(rangoHasta);
      if (fechaDia > hasta) return false;
    }

    return true;
  });

  if (historialFiltrado.length === 0) {
    contenedor.innerHTML = '<p>No hay autos que hayan salido en este rango.</p>';
    document.getElementById('total').innerText = "$0";
    return;
  }

  historialFiltrado.forEach(dia => {
    const titulo = document.createElement('h3');
    titulo.innerText = `📅 ${dia.fecha}`;
    contenedor.appendChild(titulo);

    const tabla = document.createElement('table');
    const thead = document.createElement('thead');
    thead.innerHTML = `
      <tr>
        <th>Matrícula</th>
        <th>Entrada</th>
        <th>Salida</th>
        <th>Tiempo</th>
        <th>Precio</th>
        <th></th>
      </tr>`;
    tabla.appendChild(thead);

    const tbody = document.createElement('tbody');
    dia.autos
      
      .forEach((h, index) => {
        if (dia.fecha === hoy) totalHoy += h.precio;
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${h.matricula}</td>
          <td>${h.entrada}</td>
          <td>${h.salida}</td>
          <td>${h.tiempo} min</td>
          <td>$${h.precio}</td>
          <td><button onclick="eliminarHistorial('${dia.fecha}', ${index})">❌</button></td>`;
        tbody.appendChild(row);
      });
    tabla.appendChild(tbody);
    contenedor.appendChild(tabla);
  });

  document.getElementById('total').innerText = `$${totalHoy}`;
}

// ======================
// extras
// ======================

async function generarPDF() {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  let y = 10;
  pdf.setFontSize(16);
  pdf.text("Informe de ingresos del aparcamiento", 10, y);
  y += 10;

  const rangoDesde = document.getElementById('rangoDesde').value;
  const rangoHasta = document.getElementById('rangoHasta').value;
  const historialFiltrado = historial.filter(dia => {
    const [d, m, y_] = dia.fecha.split('/');
    const fechaDia = new Date(`${y_}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);

    if (rangoDesde) {
      const desde = new Date(rangoDesde);
      if (fechaDia < desde) return false;
    }
    if (rangoHasta) {
      const hasta = new Date(rangoHasta);
      if (fechaDia > hasta) return false;
    }
    return true;
  });

  if (historialFiltrado.length === 0) {
    alert("No hay datos para este rango.");
    return;
  }

  historialFiltrado.forEach(dia => {
    pdf.setFontSize(12);
    y += 10;
    pdf.text(`Fecha: ${dia.fecha}`, 10, y);


    dia.autos
      
      .forEach(h => {
        y += 7;
        pdf.text(`${h.matricula} - Entrada: ${h.entrada} - Salida: ${h.salida} - ${h.tiempo}min - $${h.precio}`, 10, y);
        if (y > 270) {
          pdf.addPage();
          y = 10;
        }
      });
  });

  pdf.save("informe_aparcamiento.pdf");
}

function resetearDatos() {
  if (!confirm("¿Estás seguro de que quieres borrar todos los datos?")) return;

  localStorage.clear();
  autos = [];
  historial = [];
  if (window.grafico) window.grafico.destroy();
  renderizar();
}

function toggleTema() {
  document.body.classList.toggle('oscuro');
  const esOscuro = document.body.classList.contains('oscuro');
  localStorage.setItem('temaOscuro', esOscuro);
}

function nuevoMes() {
  if (!confirm("¿Comenzar un nuevo mes? Esto no borra los datos actuales.")) return;

  const fecha = prompt("Ingrese la nueva fecha de inicio de mes (YYYY-MM-DD):");
  if (!fecha) return;

  document.getElementById('rangoDesde').value = fecha;
  renderizarHistorial();
}
