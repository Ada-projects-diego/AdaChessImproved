import { Component, Input, OnInit } from '@angular/core';
import { colour } from 'src/app/shared/enums/colour.enum';
import { UpdateBoardService } from 'src/app/shared/services/update-board.service';

import { Box } from '../../../shared/model/box.model';
import { Coordinate } from '../../../shared/model/coordinate.model';

@Component({
  selector: 'app-box',
  templateUrl: './box.component.html',
  styleUrls: ['./box.component.css']
})
export class BoxComponent implements OnInit {
  @Input() box!: Box;
  @Input() possibleMoves: Coordinate[] = [];
  @Input() cantMoveCoordinate: Coordinate | null;
  @Input() selectedCoordinate: Coordinate | null;
  @Input() lastMoveFrom: Coordinate | null;
  @Input() lastMoveTo: Coordinate | null;
  @Input() isHighlighted: boolean = false;
  boxColour: colour;
  pieceColour: any = 'fas';
  constructor(private _updateBoardService: UpdateBoardService) {

  }

  ngOnInit(): void {
  }

  get pieceType(): any {
    return 'chess-' + this.box.getPiece()?.type;
  }

  get isLegalMove(): boolean {
    return this.possibleMoves?.some(
      m => m.x === this.box.coordinate.x && m.y === this.box.coordinate.y
    ) ?? false;
  }

  get isCapture(): boolean {
    return this.isLegalMove && !this.box.isEmpty();
  }

  get isCantMove(): boolean {
    return this.cantMoveCoordinate != null
      && this.cantMoveCoordinate.x === this.box.coordinate.x
      && this.cantMoveCoordinate.y === this.box.coordinate.y;
  }

  get isSelected(): boolean {
    return this.selectedCoordinate != null
      && this.selectedCoordinate.x === this.box.coordinate.x
      && this.selectedCoordinate.y === this.box.coordinate.y;
  }

  private coordMatches(coord: Coordinate | null): boolean {
    return coord != null
      && coord.x === this.box.coordinate.x
      && coord.y === this.box.coordinate.y;
  }

  get isLastMove(): boolean {
    return this.coordMatches(this.lastMoveFrom) || this.coordMatches(this.lastMoveTo);
  }

  get isWhitePiece(): boolean {
    return this.box.getPiece()?.colour === colour.WHITE;
  }

  get isBlackPiece(): boolean {
    return this.box.getPiece()?.colour === colour.BLACK;
  }

  sendCoordinates(coordinate: Coordinate): void {
    this._updateBoardService.gameMoveUpdate.next(coordinate);
  }
}