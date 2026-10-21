import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { APP_INFO } from '../../core/app-info';
import { LayoutService } from '../../core/ui/layout.service';
import { IconComponent } from '../shared/icon.component';
import { ImportButtonComponent } from '../shared/import-button.component';

@Component({
  selector: 'app-top-bar',
  imports: [IconComponent, ImportButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.css',
})
export class TopBarComponent {
  protected readonly layout = inject(LayoutService);
  protected readonly app = APP_INFO;
}
