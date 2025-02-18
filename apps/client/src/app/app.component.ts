import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';
import { Title } from '@angular/platform-browser';
import {
  ActivatedRoute,
  NavigationEnd,
  PRIMARY_OUTLET,
  Router
} from '@angular/router';
import {
  primaryColorHex,
  secondaryColorHex,
  warnColorHex
} from '@ghostfolio/common/config';
import { InfoItem, User } from '@ghostfolio/common/interfaces';
import { hasPermission, permissions } from '@ghostfolio/common/permissions';
import { ColorScheme } from '@ghostfolio/common/types';
import { MaterialCssVarsService } from 'angular-material-css-vars';
import { DeviceDetectorService } from 'ngx-device-detector';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';

import { environment } from '../environments/environment';
import { DataService } from './services/data.service';
import { TokenStorageService } from './services/token-storage.service';
import { UserService } from './services/user/user.service';

@Component({
  selector: 'gf-root',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnDestroy, OnInit {
  public canCreateAccount: boolean;
  public currentRoute: string;
  public currentYear = new Date().getFullYear();
  public deviceType: string;
  public info: InfoItem;
  public pageTitle: string;
  public user: User;
  public version = environment.version;

  private unsubscribeSubject = new Subject<void>();

  public constructor(
    private changeDetectorRef: ChangeDetectorRef,
    private dataService: DataService,
    private deviceService: DeviceDetectorService,
    private materialCssVarsService: MaterialCssVarsService,
    private router: Router,
    private title: Title,
    private tokenStorageService: TokenStorageService,
    private userService: UserService
  ) {
    this.initializeTheme();
    this.user = undefined;
  }

  public ngOnInit() {
    this.deviceType = this.deviceService.getDeviceInfo().deviceType;

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        const urlTree = this.router.parseUrl(this.router.url);
        const urlSegmentGroup = urlTree.root.children[PRIMARY_OUTLET];
        const urlSegments = urlSegmentGroup.segments;
        this.currentRoute = urlSegments[0].path;

        this.info = this.dataService.fetchInfo();

        if (this.deviceType === 'mobile') {
          setTimeout(() => {
            const index = this.title.getTitle().indexOf('–');
            const title =
              index === -1
                ? ''
                : this.title.getTitle().substring(0, index).trim();
            this.pageTitle = title.length <= 15 ? title : 'Ghostfolio';

            this.changeDetectorRef.markForCheck();
          });
        }
      });

    this.userService.stateChanged
      .pipe(takeUntil(this.unsubscribeSubject))
      .subscribe((state) => {
        this.user = state.user;

        this.canCreateAccount = hasPermission(
          this.user?.permissions,
          permissions.createUserAccount
        );

        this.initializeTheme(this.user?.settings.colorScheme);

        this.changeDetectorRef.markForCheck();
      });
  }

  public onCreateAccount() {
    this.tokenStorageService.signOut();
  }

  public onSignOut() {
    this.tokenStorageService.signOut();
    this.userService.remove();

    document.location.href = '/';
  }

  public ngOnDestroy() {
    this.unsubscribeSubject.next();
    this.unsubscribeSubject.complete();
  }

  private initializeTheme(userPreferredColorScheme?: ColorScheme) {
    const isDarkTheme = userPreferredColorScheme
      ? userPreferredColorScheme === 'DARK'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;

    this.materialCssVarsService.setDarkTheme(isDarkTheme);

    window.matchMedia('(prefers-color-scheme: dark)').addListener((event) => {
      if (!this.user?.settings.colorScheme) {
        this.materialCssVarsService.setDarkTheme(event.matches);
      }
    });

    this.materialCssVarsService.setPrimaryColor(primaryColorHex);
    this.materialCssVarsService.setAccentColor(secondaryColorHex);
    this.materialCssVarsService.setWarnColor(warnColorHex);
  }
}
