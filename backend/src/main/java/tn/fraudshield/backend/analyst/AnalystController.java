package tn.fraudshield.backend.analyst;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import tn.fraudshield.backend.alert.dto.AlertSummaryResponse;
import tn.fraudshield.backend.analyst.dto.AlertDetailResponse;
import tn.fraudshield.backend.analyst.dto.AlertStatusFilter;
import tn.fraudshield.backend.analyst.dto.AnalystDecisionRequest;
import tn.fraudshield.backend.analyst.dto.DashboardResponse;
import tn.fraudshield.backend.analyst.dto.PageResponse;

/** Espace analyste (/api/analyst/** réservé à ANALYSTE et ADMIN par SecurityConfig). */
@RestController
@RequestMapping("/api/analyst")
@RequiredArgsConstructor
public class AnalystController {

    private final AnalystService analystService;
    private final DashboardService dashboardService;

    /** Indicateurs du jour + transactions par minute (15 dernières minutes). */
    @GetMapping("/dashboard")
    public DashboardResponse getDashboard() {
        return dashboardService.getDashboard();
    }

    /** Liste paginée, plus récentes d'abord. Sans status : toutes les alertes. */
    @GetMapping("/alerts")
    public PageResponse<AlertSummaryResponse> listAlerts(
            @RequestParam(required = false) AlertStatusFilter status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return analystService.listAlerts(status, page, size);
    }

    @GetMapping("/alerts/{id}")
    public AlertDetailResponse getAlert(@PathVariable Long id) {
        return analystService.getAlert(id);
    }

    @PostMapping("/alerts/{id}/decision")
    public AlertDetailResponse decide(@PathVariable Long id,
                                      @Valid @RequestBody AnalystDecisionRequest request,
                                      @AuthenticationPrincipal UserDetails principal) {
        return analystService.decide(id, request, principal.getUsername());
    }
}
