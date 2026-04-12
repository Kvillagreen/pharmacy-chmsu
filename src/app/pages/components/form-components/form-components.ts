import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, ControlContainer, FormGroup, FormControl } from '@angular/forms';

@Component({
  selector: 'app-form',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule],
  viewProviders: [{
    provide: ControlContainer,
    useFactory: () => inject(ControlContainer, { skipSelf: true })
  }],
  templateUrl: './form-components.html'
})
export class FormComponents implements OnInit, OnDestroy {
  @Input() groupName: string = 'deliveryAddress';
  @Input() legend: string = 'Delivery Address';
  @Input() fieldsetClass: string = ''; // dynamic fieldset class
  @Input() gridClass: string = 'grid gap-4 grid-cols-2';      // dynamic grid class
  @Input() fields: Array<{
    name: string;
    label: string;
    type?: string;           // 'text', 'password', 'select', etc.
    placeholder?: string;
    value?: any;
    colSpan?: number;        // for Tailwind col-span
    wrapperClass?: string;   // optional custom div class
    inputClass?: string;     // optional input/select class
    options?: Array<{ value: any; label: string }>; // for select
  }> = [];

  private parentContainer = inject(ControlContainer);

  get parentFormGroup(): FormGroup {
    return this.parentContainer.control as FormGroup;
  }

  ngOnInit(): void {
    // Build dynamic FormGroup
    const group: any = {};
    this.fields.forEach(f => {
      group[f.name] = new FormControl(f.value || '');
    });

    // Add nested FormGroup to parent
    this.parentFormGroup.addControl(this.groupName, new FormGroup(group));
  }

  ngOnDestroy(): void {
    // Remove nested FormGroup when destroyed
    this.parentFormGroup.removeControl(this.groupName);
  }
}
