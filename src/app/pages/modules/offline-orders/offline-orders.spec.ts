import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OfflineOrders } from './offline-orders';

describe('OfflineOrders', () => {
  let component: OfflineOrders;
  let fixture: ComponentFixture<OfflineOrders>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OfflineOrders]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OfflineOrders);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
