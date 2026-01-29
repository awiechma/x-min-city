import { Nav, Navbar, NavDropdown, Container } from "react-bootstrap";
import "./css/Header.css";

function Header() {
  return (
    <Navbar expand="lg" className="bg-body-tertiary">
      <Container>
        <Navbar.Brand href="/" className="d-flex align-items-center gap-2">
          <img
            src="/images/logo.png"
            alt="x-min-city logo"
            height="28"
            className="d-inline-block align-top"
          />
          <span>x-minute-city</span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="me-auto">
            <Nav.Link href="/reachmap">ReachMap</Nav.Link>
            <Nav.Link href="/cityscope">CityScope</Nav.Link>
            <Nav.Link href="/impressum">Impressum</Nav.Link>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
}

export default Header;
