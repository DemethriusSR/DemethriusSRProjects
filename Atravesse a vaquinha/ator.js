//Código do Ator

let xAtor = 80;
let yAtor = 366;
let colisao = false;
let comprimentoCarros = 50;
let alturaCarros = 40;
let pontos = 0;


function movimentaAtor(){
  // if (keyCode == UP_ARROW){
  //   yAtor -= 2;
  // }
  // else if -de == DOWN_ARROW){
  //   yAtor += 2;
  // }
  if (keyIsDown (UP_ARROW)){
    yAtor -= 3;
  }
  if (keyIsDown(DOWN_ARROW)){
    if(podeMover()){
       yAtor += 3; 
    }
  }
}

function verificaColisao(){
    for(let i = 0; i < imagensCarros.length; i++){
        colisao = collideRectCircle(xCarros[i], yCarros[i], comprimentoCarros, alturaCarros, xAtor, yAtor, 5 )
      if (colisao){          
          posicaoInicial();
          somColisao.play();
          if(pontos > 0){
              pontos -= 1;
          }
      }
    }
}

function posicaoInicial(){
    yAtor = 366;
}

function incluiPontos(){
    textAlign(CENTER);
    textSize(25);
    fill(color(255,240,60));
    text("MEU PLACAR ",width / 2, 27);
    text(pontos, width / 1.4, 27);
}

function marcaPonto(){
    if (yAtor < 5){
        pontos += 1;
        posicaoInicial();
        somPonto.play();
    }
}

function podeMover(){
  return yAtor < 366;
}