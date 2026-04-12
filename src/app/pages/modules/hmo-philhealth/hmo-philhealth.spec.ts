import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HmoPhilhealth } from './hmo-philhealth';

describe('HmoPhilhealth', () => {
  let component: HmoPhilhealth;
  let fixture: ComponentFixture<HmoPhilhealth>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HmoPhilhealth]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HmoPhilhealth);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
