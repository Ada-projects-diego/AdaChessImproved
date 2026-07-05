import { Component, Input, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';

import { Board } from '../../shared/model/board.model';
import { Box } from '../../shared/model/box.model';
import { Coordinate } from '../../shared/model/coordinate.model';

interface Arrow {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

@Component({
  selector: 'app-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.css']
})
export class BoardComponent implements OnChanges {
  @Input() board: Board;
  @Input() possibleMoves: Coordinate[] = [];
  @Input() cantMoveCoordinate: Coordinate | null;
  @Input() selectedCoordinate: Coordinate | null;
  @Input() lastMoveFrom: Coordinate | null;
  @Input() lastMoveTo: Coordinate | null;
  @Input() flipped: boolean = false;

  @ViewChild('boardGrid', { static: false }) boardGrid: ElementRef;

  files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  displayRows: Box[][] = [];
  displayFiles: string[] = this.files;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['board'] || changes['flipped']) {
      this.updateDisplayRows();
    }
  }

  private updateDisplayRows(): void {
    if (!this.board?.boxes) return;
    if (!this.flipped) {
      this.displayRows = this.board.boxes;
      this.displayFiles = this.files;
    } else {
      this.displayRows = [...this.board.boxes].reverse().map(row => [...row].reverse());
      this.displayFiles = [...this.files].reverse();
    }
  }

  getRankLabel(displayIndex: number): number {
    return this.flipped ? displayIndex + 1 : 8 - displayIndex;
  }

  trackByRow(index: number, row: Box[]): number {
    return row[0].coordinate.x;
  }

  trackByBox(index: number, box: Box): string {
    return `${box.coordinate.x},${box.coordinate.y}`;
  }

  highlightedSquares = new Set<string>();
  arrows: Arrow[] = [];
  private arrowStart: { x: number; y: number } | null = null;

  isHighlighted(x: number, y: number): boolean {
    return this.highlightedSquares.has(`${x},${y}`);
  }

  clearAnnotations(): void {
    this.highlightedSquares.clear();
    this.arrows = [];
  }

  onBoardClick(): void {
    this.clearAnnotations();
  }

  onBoardContextMenu(event: MouseEvent): void {
    event.preventDefault();
  }

  onBoardMouseDown(event: MouseEvent): void {
    if (event.button !== 2) return;
    const sq = this.getSquareFromEvent(event);
    if (sq) {
      this.arrowStart = sq;
    }
  }

  onBoardMouseUp(event: MouseEvent): void {
    if (event.button !== 2 || !this.arrowStart) return;
    const sq = this.getSquareFromEvent(event);
    if (!sq) {
      this.arrowStart = null;
      return;
    }

    if (sq.x === this.arrowStart.x && sq.y === this.arrowStart.y) {
      const key = `${sq.x},${sq.y}`;
      if (this.highlightedSquares.has(key)) {
        this.highlightedSquares.delete(key);
      } else {
        this.highlightedSquares.add(key);
      }
    } else {
      const existingIdx = this.arrows.findIndex(
        a => a.from.x === this.arrowStart!.x && a.from.y === this.arrowStart!.y
          && a.to.x === sq.x && a.to.y === sq.y
      );
      if (existingIdx >= 0) {
        this.arrows.splice(existingIdx, 1);
      } else {
        this.arrows.push({ from: { ...this.arrowStart }, to: sq });
      }
    }
    this.arrowStart = null;
  }

  private getSquareFromEvent(event: MouseEvent): { x: number; y: number } | null {
    if (!this.boardGrid) return null;
    const el = this.boardGrid.nativeElement as HTMLElement;
    const rect = el.getBoundingClientRect();
    const rankLabelsWidth = 20;
    const relX = event.clientX - rect.left - rankLabelsWidth;
    const relY = event.clientY - rect.top;
    const squareSize = (rect.width - rankLabelsWidth) / 8;
    let col = Math.floor(relX / squareSize);
    let row = Math.floor(relY / squareSize);
    if (row < 0 || row > 7 || col < 0 || col > 7) return null;
    if (this.flipped) {
      row = 7 - row;
      col = 7 - col;
    }
    return { x: row, y: col };
  }

  getArrowX(col: number): number {
    const displayCol = this.flipped ? 7 - col : col;
    return 20 + displayCol * this.getSquareSize() + this.getSquareSize() / 2;
  }

  getArrowY(row: number): number {
    const displayRow = this.flipped ? 7 - row : row;
    return displayRow * this.getSquareSize() + this.getSquareSize() / 2;
  }

  private getSquareSize(): number {
    if (!this.boardGrid) return 60;
    const el = this.boardGrid.nativeElement as HTMLElement;
    return (el.getBoundingClientRect().width - 20) / 8;
  }
}