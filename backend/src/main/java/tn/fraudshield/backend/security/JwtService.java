package tn.fraudshield.backend.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import tn.fraudshield.backend.user.User;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Service de gestion des tokens JWT : création, validation et lecture.
 * Les tokens sont signés en HMAC-SHA256 avec la clé secrète app.jwt.secret.
 */
@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long expirationMs;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.expiration-ms}") long expirationMs) {
        // La clé doit faire au moins 256 bits (32 octets) pour HS256, sinon JJWT lève une exception
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    /** Génère un token : sujet = email, plus le rôle, l'id et le nom complet en claims. */
    public String generateToken(User user) {
        Date now = new Date();
        return Jwts.builder()
                .subject(user.getEmail())
                .claim("role", user.getRole().name())
                .claim("userId", user.getId())
                .claim("fullName", user.getFullName())
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(signingKey, Jwts.SIG.HS256)
                .compact();
    }

    /** Vrai si la signature est correcte et le token non expiré. */
    public boolean isTokenValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    /** Extrait l'email (le sujet) du token. */
    public String extractEmail(String token) {
        return parseClaims(token).getSubject();
    }

    /** Vérifie la signature et l'expiration puis renvoie le contenu du token. */
    private Claims parseClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}
