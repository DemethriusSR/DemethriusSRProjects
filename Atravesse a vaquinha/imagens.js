// Código de Imagens

let imagemDaEstrada;
let imagemDoAtor;
let imagemCarro;
let imagemCarro2;
let imagemCarro3;
let imagensCarros;

let somTrilha;
let somColisao;
let somPonto;


function preload(){
    imagemDaEstrada = loadImage("images/estrada.png");
    imagemDoAtor = loadImage("images/ator-1.png");
    imagemCarro = loadImage("images/carro-1.png");
    imagemCarro2 = loadImage("images/carro-2.png");
    imagemCarro3 = loadImage("images/carro-3.png");
    imagensCarros = [imagemCarro,imagemCarro2,imagemCarro3,
                    imagemCarro,imagemCarro2,imagemCarro3];
    somTrilha = loadSound("sound/trilha.mp3");
    somColisao = loadSound("sound/colidiu.mp3");
    somPonto = loadSound("sound/pontos.wav");
  
}

function mostraElementos(){
  image(imagemDoAtor,xAtor,yAtor,30,30);
      for(let i = 0; i < imagensCarros.length; i = i+1){  
          image(imagensCarros[i],xCarros[i],yCarros[i],50,40);
      }
  // image(imagemCarro,xCarros [0],yCarros [0],50,40);
  // image(imagemCarro2,xCarros [1],yCarros [1],50,40);
  // image(imagemCarro3,xCarros [2],yCarros [2],50,40);
}