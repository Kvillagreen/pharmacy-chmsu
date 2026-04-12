import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-button',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button
      type="{{ type }}"
      [disabled]="disabled"
      [ngClass]="classes"
      (click)="clicked.emit($event)">
      <ng-content></ng-content>
      <span *ngIf="label">{{ label }}</span>
    </button>
  `,
})
export class AppButton {
  @Input() label = '';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;
  @Input() className = '';
  @Output() clicked = new EventEmitter<Event>();

  get classes(): string {
    return `inline-flex items-center justify-center rounded-xl px-4 py-2 font-semibold transition focus:outline-none focus:ring-2 focus:ring-slate-900 ${this.className}`;
  }
}
