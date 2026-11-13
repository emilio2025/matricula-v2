// Fotos libres de uso (Unsplash, licencia gratuita, sin atribución obligatoria).
// Reemplázalas por fotos reales del colegio cuando las tengas: pon los archivos en /public/fotos
// y cambia aquí la ruta, por ejemplo: portada: '/fotos/portada.jpg'
const u = (id, w = 1600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=80`;

export const fotos = {
  portada: u('1577896851231-70ef18881754', 2200),      // Profesora con niños en el aula
  estudiante: u('1503676382389-4809596d5290', 1200),   // Estudiante con libro
  graduacion: u('1541339907198-e08756dedf3f', 2000),   // Promoción lanzando birretes
  login: u('1571260899304-425eee4c7efc', 1400),        // Estudiante con cuadernos
  registro: u('1607013407627-6ee814329547', 1400),     // Egresadas celebrando
  edificio: u('1613896527026-f195d5c818ed'),           // Pabellón
  losa: u('1705810591530-02053b1a9954'),               // Patio y áreas verdes
  aula: u('1652620364162-4c0a3387a0f0'),               // Aula
  biblioteca: u('1721702754494-fdd7189f946c'),         // Biblioteca
};

// Foto que ilustra cada nivel
export const fotoNivel = {
  inicial: u('1588075592446-265fd1e6e76f', 1000),     // Niños de inicial en la alfombra
  primaria: u('1636202339022-7d67f7447e3a', 1000),    // Niños en sus carpetas
  secundaria: u('1509062522246-3755977927d7', 1000),  // Clase de secundaria
  instituto: u('1581092160607-ee22621dd758', 1000),   // Estudiante técnico en taller
};
