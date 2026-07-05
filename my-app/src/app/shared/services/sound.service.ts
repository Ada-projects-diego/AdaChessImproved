import { Injectable } from '@angular/core';

@Injectable()
export class SoundService {
  private moveAudio = new Audio('assets/sounds/Move.mp3');
  private captureAudio = new Audio('assets/sounds/Capture.mp3');
  private checkAudio = new Audio('assets/sounds/Check.mp3');
  private checkmateAudio = new Audio('assets/sounds/Victory.mp3');
  private errorAudio = new Audio('assets/sounds/Error.mp3');

  private play(audio: HTMLAudioElement): void {
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }

  playMove(): void { this.play(this.moveAudio); }
  playCapture(): void { this.play(this.captureAudio); }
  playCheck(): void { this.play(this.checkAudio); }
  playCheckmate(): void { this.play(this.checkmateAudio); }
  playError(): void { this.play(this.errorAudio); }
}
