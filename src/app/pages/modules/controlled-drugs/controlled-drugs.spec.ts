import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ControlledDrugs } from './controlled-drugs';

describe('ControlledDrugs', () => {
  let component: ControlledDrugs;
  let fixture: ComponentFixture<ControlledDrugs>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ControlledDrugs]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ControlledDrugs);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
