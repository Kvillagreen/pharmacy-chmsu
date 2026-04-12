import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormComponents } from './form-components';

describe('FormComponents', () => {
  let component: FormComponents;
  let fixture: ComponentFixture<FormComponents>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormComponents]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormComponents);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
