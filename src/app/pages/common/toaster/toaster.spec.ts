import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Toaster } from './toaster';

describe('Toaster', () => {
  let component: Toaster;
  let fixture: ComponentFixture<Toaster>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Toaster]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Toaster);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
