import { type } from "src/app/shared/enums/type.enum";
import { colour } from "src/app/shared/enums/colour.enum";

export class Piece {
    colour:colour;
    type:type;
    hasMoved:boolean = false;
    constructor(colour:colour, type:type){
      this.colour = colour;
      this.type = type;
    }
}