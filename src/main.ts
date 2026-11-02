import { registerLocaleData } from '@angular/common';
import localeArEg from '@angular/common/locales/ar-EG';
import localeArEgExtra from '@angular/common/locales/extra/ar-EG';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

registerLocaleData(localeArEg, localeArEgExtra);

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
