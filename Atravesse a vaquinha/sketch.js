// Código Main

function setup() {
  createCanvas(500, 400);
  somTrilha.loop();
}

function draw() {
  background(imagemDaEstrada);
  mostraElementos();
  movimentaCarro();
  movimentaAtor();
  verificaColisao();
  incluiPontos();
  marcaPonto();
}