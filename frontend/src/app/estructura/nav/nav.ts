import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],  // ← estos dos
  templateUrl: './nav.html',
  styleUrl: './nav.css'
})
export class Nav {

  closeSidebar() {
    document.body.classList.remove('sidebar-open');
    document.body.style.overflow = '';
  }

}