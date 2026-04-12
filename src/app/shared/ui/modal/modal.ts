import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" (click)="overlayClick($event)">
      <div class="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" (click)="$event.stopPropagation()">
        <div class="flex items-center justify-between">
          <h3 class="text-xl font-bold">{{ title }}</h3>
          <button type="button" class="text-2xl leading-none text-slate-500 hover:text-red-500" (click)="closed.emit()">×</button>
        </div>
        <div class="mt-4">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
  `,
})
export class AppModal {
  @Input() title = '';
  @Output() closed = new EventEmitter<void>();

  overlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closed.emit();
    }
  }
}
