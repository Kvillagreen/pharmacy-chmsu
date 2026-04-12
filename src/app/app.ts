import { ChangeDetectorRef, Component, DoCheck, OnInit, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EncryptData } from '../environment/encrypt-data';
import { UserModel } from '../models/UserModel';
import { Navbar } from './pages/common/navbar/navbar';
import { Header } from './pages/common/header/header';
import { Extras } from '../extras/extras';
import { Loading } from './pages/common/loading/loading'; import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Router, NavigationStart, NavigationEnd, NavigationCancel, NavigationError } from '@angular/router';
import { UserService } from '../services/services';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private loadingSubject = new BehaviorSubject<boolean>(false);
  loading$ = this.loadingSubject.asObservable();
  show() {
    this.loadingSubject.next(true);
  }

  hide() {
    this.loadingSubject.next(false);
  }
}
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Header, Loading, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, DoCheck {

  headerKey = 0;
  extras = Extras
  currentUrl = '';
  constructor(private encryptData: EncryptData, private cd: ChangeDetectorRef, private router: Router, private userService: UserService,
    private toastrService: ToastrService
  ) {
    Extras.init(this.toastrService);
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        this.currentUrl = event.url;
        this.extras.load.set(true);
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        if (event instanceof NavigationEnd) {
          this.currentUrl = event.urlAfterRedirects;
        }
        this.headerKey++;
        this.extras.load.set(false);
      }
    });
  }
  user: UserModel = {}



  ngOnInit(): void {
    this.currentUrl = this.router.url;

    if (this.encryptData.decryptData('user')) {
      this.user.token = this.encryptData.decryptData('user').token ?? '';
    }
    this.cd.detectChanges()
  }

  ngDoCheck(): void {
    this.user.token = this.encryptData.decryptData('user');
    this.cd.detectChanges()
  }
  isAdminRoute(): boolean {
    return this.currentUrl.startsWith('/admin');
  }
  protected readonly title = signal('Frontend');


}
