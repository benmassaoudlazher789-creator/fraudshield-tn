package tn.fraudshield.backend.security;

import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;

/**
 * Configuration Spring Security : API REST stateless protégée par JWT.
 */
@Configuration
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Value("${app.cors.allowed-origins}")
    private List<String> allowedOrigins;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // Pas de cookie de session => pas de risque CSRF, on le désactive
                .csrf(AbstractHttpConfigurer::disable)
                // CORS géré par le bean corsConfigurationSource ci-dessous
                .cors(Customizer.withDefaults())
                // Stateless : aucune session HTTP, chaque requête porte son JWT
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                // Pas de formulaire de login ni d'authentification Basic
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                // Règles d'accès par URL
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()   // pré-requêtes CORS
                        .requestMatchers("/api/auth/login").permitAll()
                        .requestMatchers("/ws/**").permitAll()                    // WebSocket, sécurisé plus tard
                        .requestMatchers(HttpMethod.GET, "/ws-test.html").permitAll() // page de test STOMP
                        .requestMatchers("/error").permitAll()                    // page d'erreur Spring (400, 500...)
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/analyst/**").hasAnyRole("ANALYSTE", "ADMIN")
                        .requestMatchers("/api/client/**").hasRole("CLIENT")
                        .anyRequest().authenticated())
                // Réponses JSON au lieu des pages HTML par défaut
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, e) ->
                                writeJsonError(response, HttpServletResponse.SC_UNAUTHORIZED,
                                        "Unauthorized", "Authentification requise", request.getRequestURI()))
                        .accessDeniedHandler((request, response, e) ->
                                writeJsonError(response, HttpServletResponse.SC_FORBIDDEN,
                                        "Forbidden", "Accès refusé", request.getRequestURI())))
                // Notre filtre JWT passe avant le filtre standard login/mot de passe
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * AuthenticationManager construit par Spring à partir de CustomUserDetailsService
     * et du PasswordEncoder BCrypt : utilisé par AuthController pour vérifier email + mot de passe.
     * Déclarer notre propre UserDetailsService supprime aussi le mot de passe généré au démarrage.
     */
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    /** Autorise le frontend Angular (app.cors.allowed-origins) à appeler l'API. */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(allowedOrigins);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    /** Écrit une erreur JSON simple : {timestamp, status, error, message, path}. */
    private static void writeJsonError(HttpServletResponse response, int status,
                                       String error, String message, String path) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.getWriter().write("""
                {"timestamp":"%s","status":%d,"error":"%s","message":"%s","path":"%s"}"""
                .formatted(Instant.now(), status, error, message, escapeJson(path)));
    }

    /** Échappe les caractères spéciaux JSON (le chemin vient de la requête du client). */
    private static String escapeJson(String value) {
        return value == null ? "" : value.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
