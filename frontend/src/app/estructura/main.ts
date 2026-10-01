import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Header } from './header/header';
import { Nav } from './nav/nav';
import { Footer } from './footer/footer';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [RouterOutlet, Header, Nav, Footer],
  templateUrl: './main.html',
  styleUrl: './main.css'
})
export class Main {

  closeSidebar() {
  document.body.classList.remove('sidebar-open');
  document.body.style.overflow = '';
}

}