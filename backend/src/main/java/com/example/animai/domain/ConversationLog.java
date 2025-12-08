package com.example.animai.domain;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ConversationLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long ownerId;
    private Long eggId;
    private Long petId;

    private String speaker; // "USER" | "EGG" | "PET"

    @Lob
    private String message;

    private LocalDateTime createdAt;
}
