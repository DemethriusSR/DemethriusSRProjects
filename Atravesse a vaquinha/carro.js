// Código dos Carros

let xCarros = [600,600,600,600,600,600];
let yCarros = [40,96,150, 210,270,318];
let velocidadeCarros = [2.2,3,2.5,3.3,1.8,4];

// let xCarro = 600;
// let yCarro = 40;
// let velocidadeCarro = 2.2;

// let xCarro2 = 600;
// let yCarro2 = 96;
// let velocidadeCarro2 = 3;

// let xCarro3 = 600;
// let yCarro3 = 150;
// let velocidadeCarro3 = 2.5;

function movimentaCarro(){
    for(let i = 0; i < imagensCarros.length; i++){  
      xCarros [i] -= velocidadeCarros [i];
      // xCarros [1] -= velocidadeCarros [1];
      // xCarros [2] -= velocidadeCarros [2];
        verificaCarro();
    }
}

function verificaCarro(){
  for(let i = 0; i < imagensCarros.length; i++){  
      if (posicaoCarroInicial(xCarros[i])){
          xCarros [i]  = 600
      }
    }
}

function posicaoCarroInicial(xCarros){
    return xCarros < -42;
}

