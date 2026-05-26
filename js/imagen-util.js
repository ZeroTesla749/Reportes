/* ============================================================
   IMÁGENES — Subida, redimensionamiento y conversión a base64
   ============================================================ */

const ImagenUtil = {

  // Configuración por defecto
  MAX_WIDTH:  1200,
  MAX_HEIGHT: 900,
  CALIDAD:    0.85,

  /**
   * Lee un archivo de imagen, lo redimensiona si excede 1200x900,
   * y devuelve un objeto con: { dataUrl, width, height, sizeKB }
   *
   * Usa <canvas> para el redimensionado client-side.
   * Si la imagen es vertical y se necesita recortar al cuadro del PPT,
   * eso se hace EN EL MOMENTO DE GENERAR el PPT, no aquí.
   */
  procesar(file) {
    return new Promise((resolve, reject) => {
      if (!file) {
        reject(new Error('No se proporcionó archivo'));
        return;
      }
      if (!file.type || !file.type.startsWith('image/')) {
        reject(new Error('El archivo no es una imagen'));
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      reader.onload = e => {
        const img = new Image();
        img.onerror = () => reject(new Error('Error al decodificar la imagen'));
        img.onload = () => {
          try {
            const resultado = this._redimensionar(img);
            resolve(resultado);
          } catch (err) {
            reject(err);
          }
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  /**
   * Redimensiona una imagen usando canvas si excede los límites.
   * Mantiene proporción.
   */
  _redimensionar(img) {
    let w = img.naturalWidth;
    let h = img.naturalHeight;

    // Calcular dimensiones manteniendo proporción
    if (w > this.MAX_WIDTH || h > this.MAX_HEIGHT) {
      const ratio = Math.min(this.MAX_WIDTH / w, this.MAX_HEIGHT / h);
      w = Math.round(w * ratio);
      h = Math.round(h * ratio);
    }

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(img, 0, 0, w, h);

    // Exportar como JPEG (más compacto que PNG)
    const dataUrl = canvas.toDataURL('image/jpeg', this.CALIDAD);

    // Estimar tamaño en KB (base64 ≈ 4/3 del binario)
    const sizeKB = Math.round(dataUrl.length * 0.75 / 1024);

    return {
      dataUrl,
      width: w,
      height: h,
      sizeKB
    };
  },

  /**
   * Recorta una imagen para llenar un cuadro de ratio = wOut/hOut
   * (modo "cover": llena el cuadro, recortando si es necesario).
   * Devuelve un nuevo dataUrl con la imagen recortada.
   */
  recortarCover(dataUrl, wOut, hOut) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Error al cargar para recortar'));
      img.onload = () => {
        try {
          const iw = img.naturalWidth;
          const ih = img.naturalHeight;
          const ratioOut = wOut / hOut;
          const ratioIn  = iw / ih;

          // Calcular el recorte central
          let sx, sy, sw, sh;
          if (ratioIn > ratioOut) {
            // Imagen más ancha que el destino → recortar lados
            sh = ih;
            sw = ih * ratioOut;
            sx = (iw - sw) / 2;
            sy = 0;
          } else {
            // Imagen más alta → recortar arriba/abajo
            sw = iw;
            sh = iw / ratioOut;
            sx = 0;
            sy = (ih - sh) / 2;
          }

          const canvas = document.createElement('canvas');
          // Mantenemos un tamaño razonable en el output
          const escala = Math.min(1, 1200 / sw);
          canvas.width  = Math.round(sw * escala);
          canvas.height = Math.round(sh * escala);

          const ctx = canvas.getContext('2d');
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img,
            sx, sy, sw, sh,                  // recorte fuente
            0, 0, canvas.width, canvas.height // destino completo
          );

          resolve({
            dataUrl: canvas.toDataURL('image/jpeg', this.CALIDAD),
            width: canvas.width,
            height: canvas.height
          });
        } catch (err) {
          reject(err);
        }
      };
      img.src = dataUrl;
    });
  }
};

/* ============================================================
   GESTOR DE IMÁGENES ACTIVAS (en memoria)
   ============================================================ */
const ImagenesActivas = {
  // Array de { dataUrl, etiqueta, width, height, sizeKB }
  items: [],

  set(index, item) {
    while (this.items.length <= index) this.items.push(null);
    this.items[index] = item;
  },

  get(index) {
    return this.items[index] || null;
  },

  quitar(index) {
    if (index < this.items.length) {
      this.items[index] = null;
    }
  },

  setEtiqueta(index, etiqueta) {
    if (this.items[index]) {
      this.items[index].etiqueta = etiqueta;
    } else {
      this.items[index] = { dataUrl: null, etiqueta };
    }
  },

  ajustarLongitud(n) {
    // Mantiene las primeras n posiciones, descarta el resto
    this.items = this.items.slice(0, n);
    while (this.items.length < n) this.items.push(null);
  },

  conImagen() {
    return this.items.filter(i => i && i.dataUrl);
  },

  todas() {
    return this.items;
  },

  limpiar() {
    this.items = [];
  }
};
