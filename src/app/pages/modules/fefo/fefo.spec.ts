import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Fefo } from './fefo';

describe('Fefo', () => {
  let component: Fefo;
  let fixture: ComponentFixture<Fefo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Fefo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Fefo);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
