package tn.fraudshield.backend.admin;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import tn.fraudshield.backend.admin.dto.CreateUserRequest;
import tn.fraudshield.backend.admin.dto.RuleResponse;
import tn.fraudshield.backend.admin.dto.UpdateRuleRequest;
import tn.fraudshield.backend.admin.dto.UpdateUserRequest;
import tn.fraudshield.backend.admin.dto.UpdateUserStatusRequest;
import tn.fraudshield.backend.admin.dto.UserResponse;
import tn.fraudshield.backend.analyst.dto.PageResponse;
import tn.fraudshield.backend.user.Role;

import java.util.List;

/** Administration (/api/admin/** réservé au rôle ADMIN par SecurityConfig). */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminUserService userService;
    private final AdminRuleService ruleService;

    @GetMapping("/users")
    public PageResponse<UserResponse> listUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) Boolean enabled,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return userService.listUsers(search, role, enabled, page, size);
    }

    @PostMapping("/users")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse createUser(@Valid @RequestBody CreateUserRequest request,
                                   @AuthenticationPrincipal UserDetails principal) {
        return userService.createUser(request, principal.getUsername());
    }

    @PatchMapping("/users/{id}")
    public UserResponse updateUser(@PathVariable Long id,
                                   @Valid @RequestBody UpdateUserRequest request,
                                   @AuthenticationPrincipal UserDetails principal) {
        return userService.updateUser(id, request, principal.getUsername());
    }

    @PatchMapping("/users/{id}/status")
    public UserResponse updateStatus(@PathVariable Long id,
                                     @Valid @RequestBody UpdateUserStatusRequest request,
                                     @AuthenticationPrincipal UserDetails principal) {
        return userService.updateStatus(id, request.enabled(), principal.getUsername());
    }

    @GetMapping("/rules")
    public List<RuleResponse> listRules() {
        return ruleService.listRules();
    }

    @PatchMapping("/rules/{id}")
    public RuleResponse updateRule(@PathVariable Long id,
                                   @Valid @RequestBody UpdateRuleRequest request,
                                   @AuthenticationPrincipal UserDetails principal) {
        return ruleService.updateRule(id, request, principal.getUsername());
    }
}
