import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  imports: [CommonModule, FormsModule]
})
export class LoginComponent implements OnInit {
  username = '';
  password = '';
  error = false;

  constructor(
    private session: SessionService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    if (this.session.isAuthenticated()) {
      this.router.navigate(['/upload'], { replaceUrl: true });
    }
  }

  async login(): Promise<void> {
    const success = await this.session.login(this.username, this.password);

    if (success) {
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/upload';
      this.router.navigate([returnUrl], { replaceUrl: true });
    } else {
      this.error = true;
    }
  }
}
