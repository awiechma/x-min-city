import { Nav, Navbar, NavDropdown, Container } from "react-bootstrap";
import "./css/Header.css";

function Header() {
  return (
    <Navbar expand="lg" className="bg-body-tertiary">
      <Container>
        <Navbar.Brand href="/ ">x-minute-city</Navbar.Brand>
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
