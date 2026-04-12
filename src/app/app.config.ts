import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideToastr({
      toastClass: 'ngx-toast extras-toast-base',
      positionClass: 'toast-bottom-right',
      timeOut: 3000,
      closeButton: false,
      tapToDismiss: true,
      progressBar: false,
      newestOnTop: true,
    }),
  ]
};
