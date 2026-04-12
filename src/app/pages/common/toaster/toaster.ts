// toast.component.ts
import { Component, Input } from '@angular/core';
import { ToastController } from '@ionic/angular';

@Component({
  selector: 'app-toaster',
  template: `
    <div class="flex items-center justify-between space-x-4">
      <span>{{ message }}</span>
      <button (click)="dismiss()" class="text-white font-bold">×</button>
    </div>
  `,
})

export class Toaster {
  @Input() message: string = '';

  constructor(private toastCtrl: ToastController) {}

  dismiss() {
    this.toastCtrl.dismiss();
  }
}
